//! Reads live Windows toast notifications straight from the notification
//! platform's SQLite store (`wpndatabase.db`), which is the same data the
//! Action Center shows. Notifications are dismissed from that store when the
//! user clears them, so it reflects the current Action Center contents.
//!
//! SQLite is provided by the in-box `winsqlite3.dll` (linked via the Windows
//! SDK import library) so no C compilation or extra crate is required.

use serde::Serialize;
use std::os::raw::{c_char, c_int, c_uchar};
use std::path::{Path, PathBuf};
use std::ptr::null_mut;

#[derive(Serialize, Clone)]
pub struct AppNotification {
    pub id: i64,
    pub app_name: String,
    pub app_id: String,
    pub title: String,
    pub body: String,
    /// Unix time in milliseconds.
    pub timestamp: i64,
    /// `data:` URI of the app logo, if one was embedded in the payload.
    pub icon: Option<String>,
    pub is_system: bool,
}

// ── Minimal winsqlite3 FFI ─────────────────────────────────────────

#[repr(C)]
struct sqlite3 {
    _private: [u8; 0],
}

#[repr(C)]
struct sqlite3_stmt {
    _private: [u8; 0],
}

#[link(name = "winsqlite3")]
extern "C" {
    fn sqlite3_open_v2(
        filename: *const c_char,
        pp_db: *mut *mut sqlite3,
        flags: c_int,
        z_vfs: *const c_char,
    ) -> c_int;
    fn sqlite3_prepare_v2(
        db: *mut sqlite3,
        z_sql: *const c_char,
        n_byte: c_int,
        pp_stmt: *mut *mut sqlite3_stmt,
        pz_tail: *mut *const c_char,
    ) -> c_int;
    fn sqlite3_step(stmt: *mut sqlite3_stmt) -> c_int;
    fn sqlite3_column_int64(stmt: *mut sqlite3_stmt, col: c_int) -> i64;
    fn sqlite3_column_text(stmt: *mut sqlite3_stmt, col: c_int) -> *const c_uchar;
    fn sqlite3_column_bytes(stmt: *mut sqlite3_stmt, col: c_int) -> c_int;
    fn sqlite3_finalize(stmt: *mut sqlite3_stmt) -> c_int;
    fn sqlite3_close(db: *mut sqlite3) -> c_int;
}

const SQLITE_OK: c_int = 0;
const SQLITE_ROW: c_int = 100;
const SQLITE_DONE: c_int = 101;
const SQLITE_OPEN_READONLY: c_int = 0x0000_0001;

/// A single notification row pulled from the store.
struct RawRow {
    payload: String,
    arrival: i64,
    app_id: String,
    handler_type: String,
    tag: String,
    order: i64,
}

/// FILETIME (100 ns ticks since 1601) → Unix milliseconds.
fn filetime_to_unix_ms(ticks: i64) -> i64 {
    const TICKS_TO_MS: i64 = 10_000;
    const EPOCH_DIFF_MS: i64 = 11_644_473_600_000;
    ticks / TICKS_TO_MS - EPOCH_DIFF_MS
}

fn db_path() -> Option<PathBuf> {
    let base = std::env::var_os("LOCALAPPDATA")?;
    Some(PathBuf::from(base).join("Microsoft\\Windows\\Notifications\\wpndatabase.db"))
}

/// Copies the database (and its WAL) into a private temp file so it can be read
/// even when the live file cannot be opened read-only.
fn snapshot(src: &Path) -> Result<PathBuf, String> {
    let dir = std::env::temp_dir().join(format!("bloom_notifications_{}", std::process::id()));
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let dst = dir.join("wpndatabase.db");
    std::fs::copy(src, &dst).map_err(|e| e.to_string())?;
    for suffix in ["-wal", "-shm"] {
        let from = PathBuf::from(format!("{}{}", src.display(), suffix));
        if from.exists() {
            let to = PathBuf::from(format!("{}{}", dst.display(), suffix));
            let _ = std::fs::copy(&from, &to);
        }
    }
    Ok(dst)
}

fn open_readonly(path: &Path) -> Result<*mut sqlite3, String> {
    let c_path = std::ffi::CString::new(path.to_string_lossy().as_bytes())
        .map_err(|_| "Invalid database path".to_string())?;
    unsafe {
        let mut db: *mut sqlite3 = null_mut();
        let rc = sqlite3_open_v2(c_path.as_ptr(), &mut db, SQLITE_OPEN_READONLY, std::ptr::null());
        if rc != SQLITE_OK || db.is_null() {
            if !db.is_null() {
                sqlite3_close(db);
            }
            return Err(format!("Failed to open notification database (code {rc})"));
        }
        Ok(db)
    }
}

fn col_text(stmt: *mut sqlite3_stmt, col: c_int) -> Option<String> {
    unsafe {
        let ptr = sqlite3_column_text(stmt, col);
        if ptr.is_null() {
            return None;
        }
        let len = sqlite3_column_bytes(stmt, col).max(0) as usize;
        if len == 0 {
            return Some(String::new());
        }
        let slice = std::slice::from_raw_parts(ptr, len);
        Some(String::from_utf8_lossy(slice).into_owned())
    }
}

/// Runs the query against an opened database and collects raw rows. Newest
/// first. `order` is the store's monotonic sequence, used to keep the most
/// recent entry when de-duplicating grouped toasts.
fn query_rows(db: *mut sqlite3) -> Result<Vec<RawRow>, String> {
    let sql = std::ffi::CString::new(
        "SELECT n.Payload, n.ArrivalTime, n.Order, h.PrimaryId, h.HandlerType, n.Tag \
         FROM Notification n \
         LEFT JOIN NotificationHandler h ON h.RecordId = n.HandlerId \
         WHERE n.Type = 'toast' \
         ORDER BY n.ArrivalTime DESC, n.Order DESC \
         LIMIT 300",
    )
    .map_err(|_| "Invalid query".to_string())?;

    unsafe {
        let mut stmt: *mut sqlite3_stmt = null_mut();
        let rc = sqlite3_prepare_v2(db, sql.as_ptr(), -1, &mut stmt, std::ptr::null_mut());
        if rc != SQLITE_OK || stmt.is_null() {
            return Err(format!("Failed to prepare notification query (code {rc})"));
        }

        let mut rows = Vec::new();
        loop {
            let step = sqlite3_step(stmt);
            if step == SQLITE_ROW {
                rows.push(RawRow {
                    payload: col_text(stmt, 0).unwrap_or_default(),
                    arrival: sqlite3_column_int64(stmt, 1),
                    order: sqlite3_column_int64(stmt, 2),
                    app_id: col_text(stmt, 3).unwrap_or_else(|| "Unknown".to_string()),
                    handler_type: col_text(stmt, 4).unwrap_or_default(),
                    tag: col_text(stmt, 5).unwrap_or_default(),
                });
            } else if step == SQLITE_DONE {
                break;
            } else {
                sqlite3_finalize(stmt);
                return Err(format!("Notification query failed (code {step})"));
            }
        }
        sqlite3_finalize(stmt);
        Ok(rows)
    }
}

// ── Payload parsing ────────────────────────────────────────────────

struct ParsedPayload {
    title: String,
    body: String,
    icon: Option<String>,
}

/// Pulls the human-readable text and the app-logo image out of a toast payload.
fn parse_payload(xml: &str) -> ParsedPayload {
    use quick_xml::events::Event;
    use quick_xml::Reader;

    let mut reader = Reader::from_str(xml);
    let mut texts: Vec<String> = Vec::new();
    let mut in_text = false;
    let mut current = String::new();
    let mut logo_src: Option<String> = None;
    let mut fallback_src: Option<String> = None;

    loop {
        match reader.read_event() {
            Ok(Event::Start(e)) | Ok(Event::Empty(e)) => {
                let name = e.local_name();
                match name.as_ref() {
                    b"text" => {
                        in_text = true;
                        current.clear();
                    }
                    b"image" => {
                        let mut placement = String::new();
                        let mut src = String::new();
                        for attr in e.attributes().flatten() {
                            let key = attr.key.local_name();
                            let value = attr.unescape_value().unwrap_or_default().into_owned();
                            match key.as_ref() {
                                b"placement" => placement = value,
                                b"src" => src = value,
                                _ => {}
                            }
                        }
                        if !src.is_empty() {
                            if placement == "appLogoOverride" {
                                logo_src = Some(src);
                            } else if fallback_src.is_none() {
                                fallback_src = Some(src);
                            }
                        }
                    }
                    _ => {}
                }
            }
            Ok(Event::Text(e)) => {
                if in_text {
                    current.push_str(&e.unescape().unwrap_or_default());
                }
            }
            Ok(Event::CData(e)) => {
                if in_text {
                    current.push_str(&String::from_utf8_lossy(&e.into_inner()));
                }
            }
            Ok(Event::End(e)) => {
                if e.local_name().as_ref() == b"text" && in_text {
                    texts.push(current.trim().to_string());
                    in_text = false;
                    current.clear();
                }
            }
            Ok(Event::Eof) | Err(_) => break,
            _ => {}
        }
    }

    let mut title = texts.first().cloned().unwrap_or_default();
    let body = if texts.len() > 1 {
        texts[1..]
            .iter()
            .filter(|t| !t.is_empty())
            .cloned()
            .collect::<Vec<_>>()
            .join(" \u{00b7} ")
    } else {
        String::new()
    };

    // Some templates put only the body in the first slot; keep a usable title.
    if title.is_empty() && !body.is_empty() {
        title = body.clone();
    }

    let logo = logo_src
        .or(fallback_src)
        .filter(|p| !p.is_empty())
        .and_then(|p| crate::utils::image_file_to_base64(&p));

    ParsedPayload {
        title,
        body,
        icon: logo,
    }
}

/// Turns an AppUserModelID into something a person can read.
fn friendly_app_name(app_id: &str, handler_type: &str) -> String {
    let app_id = app_id.trim();
    if handler_type == "app:desktop" {
        return app_id
            .strip_suffix(".exe")
            .unwrap_or(app_id)
            .to_string();
    }
    if handler_type == "app:system" {
        return app_id
            .trim_start_matches("Windows.SystemToast.")
            .to_string();
    }
    // Packaged app: `PackageFamilyName_hash!EntryPoint`.
    let pkg = app_id.split('!').next().unwrap_or(app_id);
    let pkg = match pkg.rsplit_once('_') {
        Some((head, tail))
            if !head.is_empty()
                && tail.len() >= 8
                && tail.chars().all(|c| c.is_ascii_alphanumeric()) =>
        {
            head
        }
        _ => pkg,
    };
    let short = pkg.rsplit('.').next().unwrap_or(pkg);
    if short.is_empty() {
        pkg.to_string()
    } else {
        short.to_string()
    }
}

/// Reads current toast notifications, newest first, de-duplicated by group/tag.
pub fn read_notifications(
    limit: usize,
    include_system: bool,
) -> Result<Vec<AppNotification>, String> {
    let path = db_path().ok_or_else(|| "LOCALAPPDATA is not set".to_string())?;
    if !path.exists() {
        return Err("Notification database was not found".to_string());
    }

    // Prefer reading the live file; fall back to a private snapshot if the
    // service holds an exclusive handle.
    let (db, tmp) = match open_readonly(&path) {
        Ok(db) => (db, None),
        Err(_) => {
            let snap = snapshot(&path)?;
            (open_readonly(&snap)?, Some(snap))
        }
    };

    let rows = query_rows(db);
    unsafe {
        sqlite3_close(db);
    }
    if let Some(tmp) = tmp {
        let _ = std::fs::remove_file(&tmp);
    }
    let mut rows = rows?;

    // Newest already first because of ORDER BY.
    let _ = &mut rows;

    let mut seen: std::collections::HashSet<String> = std::collections::HashSet::new();
    let mut out: Vec<AppNotification> = Vec::new();

    for row in rows {
        let is_system = row.handler_type == "app:system"
            || row.app_id.starts_with("Windows.")
            || row.app_id.contains("SystemToast");
        if is_system && !include_system {
            continue;
        }

        let parsed = parse_payload(&row.payload);
        if parsed.title.is_empty() && parsed.body.is_empty() {
            continue;
        }

        // Collapse repeats of the same grouped toast (same app + tag/content).
        let dedupe_key = if !row.tag.is_empty() {
            format!("{}|{}", row.app_id, row.tag)
        } else {
            format!("{}|{}|{}", row.app_id, parsed.title, parsed.body)
        };
        if !seen.insert(dedupe_key) {
            continue;
        }

        out.push(AppNotification {
            id: row.order.max(0),
            app_name: friendly_app_name(&row.app_id, &row.handler_type),
            app_id: row.app_id.clone(),
            title: parsed.title,
            body: parsed.body,
            timestamp: filetime_to_unix_ms(row.arrival),
            icon: parsed.icon,
            is_system,
        });

        if out.len() >= limit {
            break;
        }
    }

    Ok(out)
}

/// Returns the current toast notifications for the lock screen.
pub fn get_notifications(
    limit: Option<usize>,
    include_system: Option<bool>,
) -> Result<Vec<AppNotification>, String> {
    let limit = limit.unwrap_or(5).clamp(1, 20);
    let include_system = include_system.unwrap_or(false);
    read_notifications(limit, include_system)
}
