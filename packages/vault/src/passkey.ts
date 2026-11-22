import { randomBytes, toBase64Url, fromBase64Url, type Bytes } from './crypto';

/**
 * Passkeys as a lock method, via the WebAuthn PRF extension (docs/PRIVACY.md §2).
 * The authenticator returns a secret derived from a salt we keep; that secret wraps the Vault Key.
 */

type PrfResults = { prf?: { enabled?: boolean; results?: { first?: ArrayBuffer } } };

export async function passkeysSupported(): Promise<boolean> {
  if (typeof window === 'undefined' || !window.PublicKeyCredential || !navigator.credentials) return false;
  const pkc = window.PublicKeyCredential as unknown as { getClientCapabilities?: () => Promise<Record<string, boolean>> };
  try {
    const caps = await pkc.getClientCapabilities?.();
    if (caps) return caps['extension:prf'] === true && caps.userVerifyingPlatformAuthenticator !== false;
  } catch {
    /* fall through */
  }
  return false;
}

export async function createPasskey(): Promise<{ credentialId: string; prfSalt: string; secret: Bytes }> {
  const prfSalt = randomBytes(32);
  const cred = (await navigator.credentials.create({
    publicKey: {
      rp: { name: 'ETERNALL' },
      user: { id: randomBytes(16), name: 'ETERNALL vault', displayName: 'ETERNALL' },
      challenge: randomBytes(32),
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 },
      ],
      authenticatorSelection: { residentKey: 'preferred', userVerification: 'required' },
      extensions: { prf: { eval: { first: prfSalt } } } as AuthenticationExtensionsClientInputs,
    },
  })) as PublicKeyCredential | null;
  if (!cred) throw new Error('No passkey was created.');
  const credentialId = toBase64Url(new Uint8Array(cred.rawId));
  const ext = cred.getClientExtensionResults() as PrfResults;
  if (ext.prf?.enabled === false) throw new Error('This passkey can’t protect a vault (no PRF support). Use a passphrase instead.');
  const first = ext.prf?.results?.first;
  const secret = first ? new Uint8Array(first) : await evaluatePasskey(credentialId, toBase64Url(prfSalt));
  return { credentialId, prfSalt: toBase64Url(prfSalt), secret };
}

export async function evaluatePasskey(credentialId: string, prfSalt: string): Promise<Bytes> {
  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge: randomBytes(32),
      allowCredentials: [{ type: 'public-key', id: fromBase64Url(credentialId) }],
      userVerification: 'required',
      extensions: { prf: { eval: { first: fromBase64Url(prfSalt) } } } as AuthenticationExtensionsClientInputs,
    },
  })) as PublicKeyCredential | null;
  const first = (assertion?.getClientExtensionResults() as PrfResults | undefined)?.prf?.results?.first;
  if (!first) throw new Error('The passkey didn’t return a key. Try again, or use your recovery key.');
  return new Uint8Array(first);
}
