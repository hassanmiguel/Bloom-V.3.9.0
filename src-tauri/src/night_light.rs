use std::sync::atomic::{AtomicU32, Ordering};

/// Night-light intensity scaled 0..=1000 (0 = off). Kept in state so the
/// startup hook and repeated settings calls stay consistent.
pub static NIGHT_LIGHT_INTENSITY: AtomicU32 = AtomicU32::new(0);

/// Applies a warm "night light" colour temperature to every monitor.
/// `intensity` is 0.0 (off / neutral) to 1.0 (warmest).
pub fn set_intensity(intensity: f32) -> Result<(), String> {
    let clamped = intensity.clamp(0.0, 1.0);
    NIGHT_LIGHT_INTENSITY.store((clamped * 1000.0).round() as u32, Ordering::Relaxed);
    apply_gamma(clamped)
}

fn apply_gamma(intensity: f32) -> Result<(), String> {
    unsafe {
        use windows::core::{BOOL, PCSTR};
        use windows::Win32::Foundation::{LPARAM, RECT};
        use windows::Win32::Graphics::Gdi::{
            CreateDCA, DeleteDC, EnumDisplayMonitors, GetMonitorInfoA, HDC, HMONITOR,
            MONITORINFOEXA,
        };
        use windows::Win32::UI::ColorSystem::SetDeviceGammaRamp;

        // Channel gains: red stays, green dims slightly, blue dims most, which
        // shifts the white point toward a warm amber.
        let gain = |g: f32| -> [u16; 256] {
            let mut a = [0u16; 256];
            for (i, slot) in a.iter_mut().enumerate() {
                *slot = ((i as f32) * g * 256.0).round().min(65535.0) as u16;
            }
            a
        };
        let red = gain(1.0);
        let green = gain(1.0 - 0.30 * intensity);
        let blue = gain(1.0 - 0.60 * intensity);

        let mut ramp = [0u16; 768];
        ramp[0..256].copy_from_slice(&red);
        ramp[256..512].copy_from_slice(&green);
        ramp[512..768].copy_from_slice(&blue);
        let ramp_ptr = ramp.as_ptr() as *const core::ffi::c_void;

        unsafe extern "system" fn monitor_enum_proc(
            hmonitor: HMONITOR,
            _: HDC,
            _: *mut RECT,
            lparam: LPARAM,
        ) -> BOOL {
            let ramp_ptr = lparam.0 as *const core::ffi::c_void;
            let mut info = MONITORINFOEXA::default();
            info.monitorInfo.cbSize = std::mem::size_of::<MONITORINFOEXA>() as u32;
            if GetMonitorInfoA(
                hmonitor,
                &mut info.monitorInfo as *mut _ as *mut _,
            )
            .as_bool()
            {
                let device = PCSTR(info.szDevice.as_ptr() as *const u8);
                let hdc = CreateDCA(PCSTR::null(), device, PCSTR::null(), None);
                if !hdc.is_invalid() {
                    let _ = SetDeviceGammaRamp(hdc, ramp_ptr);
                    let _ = DeleteDC(hdc);
                }
            }
            true.into()
        }

        let _ = EnumDisplayMonitors(
            None,
            None,
            Some(monitor_enum_proc),
            LPARAM(ramp_ptr as isize),
        );
    }
    Ok(())
}
