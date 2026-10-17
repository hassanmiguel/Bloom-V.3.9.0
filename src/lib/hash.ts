const isHashed = (value: string) => value.startsWith("sha256:") || value.startsWith("fnv:");

export async function hashSecret(value: string): Promise<string> {
	if (!value) return "";
	const subtle = globalThis.crypto?.subtle;
	if (subtle) {
		const digest = await subtle.digest("SHA-256", new TextEncoder().encode(value));
		const hex = Array.from(new Uint8Array(digest))
			.map((b) => b.toString(16).padStart(2, "0"))
			.join("");
		return `sha256:${hex}`;
	}
	// FNV-1a fallback for contexts without SubtleCrypto.
	let hash = 2166136261 >>> 0;
	for (let i = 0; i < value.length; i++) {
		hash ^= value.charCodeAt(i);
		hash = Math.imul(hash, 16777619) >>> 0;
	}
	return `fnv:${hash.toString(16).padStart(8, "0")}`;
}

/** Verifies `input` against a stored secret. Legacy plaintext values still work. */
export async function verifySecret(input: string, stored: string): Promise<boolean> {
	if (!stored) return true;
	if (isHashed(stored)) return (await hashSecret(input)) === stored;
	return input === stored;
}

export { isHashed };
