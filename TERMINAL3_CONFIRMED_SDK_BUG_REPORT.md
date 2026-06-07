# Terminal 3 SDK - Confirmed Bug Report

**Submission for:** Terminal 3 Agent Dev Kit / SDK Bug Discovery Bounty  
**Reporter:** fadhmusty@example.com  
**Test window:** 2026-06-06 to 2026-06-07  
**Method:** Built SpendPass with Agent Auth, then audited the published npm SDK tarballs and installed Agent Auth SDK/plugin source. This report only includes findings verified from package source, package READMEs, package types, or reproducible TypeScript/runtime behavior.  

**Severity legend:** blocker · major · minor · docs/polish

**Verified package versions:**
- `@terminal3/bbs_vc@0.2.36`
- `@terminal3/verify_vp@0.0.48`
- `@terminal3/vc_core@0.0.37`
- `@terminal3/verify_vc@0.0.38`
- `@terminal3/verify_vc_core@0.0.37`
- `@terminal3/revoke_vc@0.1.33`
- `@terminal3/ecdsa_vc@0.1.34`
- `@terminal3/vc_cast@0.1.32`
- `@auth/agent@0.5.1`
- `@better-auth/agent-auth@0.5.1`

---

## A. High-Confidence Terminal 3 VC SDK Bugs

### 1. BBS presentation verification uses a hardcoded nonce

**Severity:** major  
**Where:** `@terminal3/verify_vp` - `src/verifyVP.ts`, `src/verifyBbsVpW3c.ts`

**Expected:** A verifier should pass a fresh challenge/nonce into presentation verification so derived BBS proofs are bound to the current session.

**Actual:** Both BBS presentation verification paths call `blsVerifyProof` with a constant nonce:

```ts
nonce: Uint8Array.from(Buffer.from('nonce', 'utf8'))
```

**Impact:** The SDK cannot verify a proof generated for a real verifier challenge. If holders generate proofs using the same constant string, the proof can be replayed across sessions.

---

### 2. `verifyPresentation()` has no challenge/domain option

**Severity:** major  
**Where:** `@terminal3/vc_core` - `VerificationOptions`, `VerifiablePresentation`

**Expected:** VP verification should accept verifier challenge/domain values.

**Actual:** `VerificationOptions` has revocation/provider fields, but no `challenge`, `nonce`, or `domain`. `VerifiablePresentation` only contains:

```ts
holder: string;
credentials: PartialCredential[];
```

**Impact:** Even if a developer wants to do challenge-bound verification correctly, the public types do not expose the input needed.

---

### 3. `verifyPresentation()` does not verify a VP-level holder proof

**Severity:** major  
**Where:** `@terminal3/verify_vp` - `src/verifyVP.ts`

**Expected:** A verifier should confirm the presentation is controlled by the holder and bound to the current verifier request.

**Actual:** `verifyPresentation(vp)` loops through `vp.credentials` and verifies each credential proof. It does not verify a presentation-level proof, holder signature, challenge, or domain.

**Impact:** The SDK verifies credentials, but not the presentation as an authenticated holder action. This is dangerous for agent/holder workflows where replay and holder binding are core requirements.

---

### 4. No public holder-side selective-disclosure API

**Severity:** major  
**Where:** `@terminal3/bbs_vc`, `@terminal3/verify_vp`

**Expected:** The public SDK should expose a high-level function that turns a signed BBS credential into a selectively disclosed `PartialCredential` / VP.

**Actual:** The packages expose issuance, verification, message extraction, CBOR helpers, and verifier functions, but no high-level `derivePresentation`, `createPresentation`, or `makeBBSPlusW3cProof` equivalent for holder-side derived proofs.

**Impact:** `verifyPresentation()` consumes derived presentations, but the public SDK does not provide the obvious matching function to create them. Developers must compose low-level internals and `@mattrglobal/bbs-signatures` themselves.

---

### 5. `verifyBbsVpW3c()` source docs describe the wrong cryptosuite

**Severity:** minor  
**Where:** `@terminal3/verify_vp` - `src/verifyBbsVpW3c.ts`

**Expected:** Function docs should describe BBS/BLS12-381 selective-disclosure verification.

**Actual:** The JSDoc says it verifies an ECDSA-SD derived document and mentions a P-256 public key. The implementation actually verifies BBS proofs using `blsVerifyProof`.

**Impact:** Developers auditing or extending the SDK get misleading cryptographic guidance in the source.

---

### 6. Revocation verification ignores `credentialStatus` unless options are passed manually

**Severity:** major  
**Where:** `@terminal3/verify_vc_core` - `src/verifyVC.ts`; `@terminal3/vc_core` - `src/prepareCredentialPayload.ts`

**Expected:** If a credential contains `credentialStatus`, verification should use it or clearly document that revocation options must be passed separately.

**Actual:** `prepareCredentialPayload()` writes revocation metadata into `credentialStatus`, but `verifyVcNonSpecificPart()` only checks revocation when the caller passes `options.revocationRegistryAddress`.

**Impact:** A revoked credential can verify as valid when the caller assumes the SDK reads the credential's own status metadata. The `revoke_vc` README also calls verification without passing options, which reinforces the wrong expectation.

---

### 7. `revokeVC()` returns before the revocation transaction is mined

**Severity:** major  
**Where:** `@terminal3/revoke_vc` - `src/revokeVC.ts`

**Expected:** `revokeVC()` should resolve after the transaction is mined, or return the transaction response so callers can wait.

**Actual:** The function does:

```ts
await contract.revoke(vcId);
```

It does not call `tx.wait()`.

**Impact:** Calling `isRevoked()` immediately after `await revokeVC(...)` can still return false. The README works around this with a fixed 10 second sleep.

---

### 8. Credentials without expiry are emitted with `validUntil: ""`

**Severity:** minor  
**Where:** `@terminal3/vc_core` - `src/prepareCredentialPayload.ts`

**Expected:** Optional W3C date fields should be omitted when absent.

**Actual:** When `validUntil` is undefined, the SDK emits:

```ts
validUntil: ''
```

**Impact:** The credential contains a present but invalid date-time value. This can create interop issues with W3C VC processors and JSON-LD tooling.

---

### 9. BBS credentials always make `/validUntil` mandatory, even when it is empty

**Severity:** minor  
**Where:** `@terminal3/bbs_vc` - `src/issueBbsVc.ts`

**Expected:** Optional fields should not be forced into mandatory disclosure when absent.

**Actual:** `alwaysMandatory` includes `/validUntil`, while `vc_core` emits `validUntil: ""` for credentials with no expiry.

**Impact:** Non-expiring credentials sign and disclose an empty expiry field. This compounds the invalid-date issue above.

---

### 10. Null/undefined handling in BBS message traversal uses an impossible condition

**Severity:** minor  
**Where:** `@terminal3/bbs_vc` - `src/issueBbsVc.ts`

**Expected:** Nullish leaf values should be handled consistently, probably with `obj === undefined || obj === null`.

**Actual:** The code uses:

```ts
obj === undefined && obj === null ? '' : String(obj)
```

That condition can never be true.

**Impact:** `null` and `undefined` are signed as the literal strings `"null"` and `"undefined"`. This is almost certainly not intended and can change the signed message set.

---

### 11. `EthrDID` default constructor creates a nonstandard double-colon DID

**Severity:** major  
**Where:** `@terminal3/ecdsa_vc` - `src/EthrDid.ts`

**Expected:** Without a chain name, the DID should be `did:ethr:0x...`.

**Actual:** The constructor sets `chainName = ''` and builds:

```ts
const identifier = `${chainName}:${wallet.address}`;
```

This produces `did:ethr::0x...`.

**Impact:** The SDK emits a malformed/nonstandard DID by default. Other DID resolvers may reject it even though the SDK's own parser works around it.

---

### 12. ECDSA registry-mode proof uses a bare address as `verificationMethod`

**Severity:** minor  
**Where:** `@terminal3/ecdsa_vc` - `src/issueEcdsaVc.ts`

**Expected:** `verificationMethod` should be a DID URL.

**Actual:** In registry mode the SDK sets:

```ts
verificationMethod = ethrDid.wallet.address + signatureRole
```

instead of a DID URL based on the issuer DID.

**Impact:** The proof metadata is less interoperable with W3C VC tooling and DID-based verifiers.

---

### 13. `revoke_vc` provider helper is implemented but not exported

**Severity:** minor  
**Where:** `@terminal3/revoke_vc` - `src/providers.ts`, `src/index.ts`

**Expected:** A helper implemented in the package should be exported from the package root if it is part of the SDK.

**Actual:** `getProvider()` exists in `providers.ts`, but `src/index.ts` only exports `./revokeVC`.

**Impact:** Developers cannot import the helper via `@terminal3/revoke_vc` even though the package ships it.

---

### 14. DID utility accepts malformed DIDs

**Severity:** minor  
**Where:** `@terminal3/vc_core` - `src/didManager.ts`

**Expected:** `isDIDString()` should validate at least the `did:<method>:<identifier>` shape, and `getMethodIdentifier()` should reject empty identifiers.

**Actual:** `isDIDString()` only checks `str.startsWith('did:')`. `getMethodIdentifier()` checks the method but allows an empty identifier.

**Impact:** Malformed DIDs can pass SDK validation and fail later in less obvious places.

---

## B. Agent Auth SDK / Plugin Bugs

### 15. AI SDK v6 adapter emits the old tool shape

**Severity:** major  
**Where:** `@auth/agent` - `toAISDKTools()` vs `ai@6.0.197`

**Expected:** The SDK adapter should return tools assignable to AI SDK v6 `ToolSet`.

**Actual:** `toAISDKTools()` emits `parameters`, while AI SDK v6 expects `inputSchema`.

**Repro:**

```ts
const tools = await toAISDKTools(getAgentAuthTools(client));
streamText({ model, tools });
```

TypeScript reports that `inputSchema` is missing.

**Impact:** The documented adapter path fails for current AI SDK v6 projects unless developers use unsafe casts or write their own adapter.

---

### 16. SDK fallback discovery path does not match the Better Auth provider route

**Severity:** major  
**Where:** `@auth/agent` discovery vs `@better-auth/agent-auth` provider route

**Expected:** The SDK fallback should find the provider plugin's discovery endpoint.

**Actual:** The SDK tries:

```ts
/.well-known/agent-configuration
/api/auth/agent/agent-configuration
```

The Better Auth plugin exposes:

```ts
createAuthEndpoint('/agent-configuration', ...)
```

which mounts as `/api/auth/agent-configuration`.

**Impact:** Direct discovery fails unless the app manually adds the `.well-known` route.

---

### 17. `requestCapability()` resolves before an escalated grant is active

**Severity:** major  
**Where:** `@auth/agent` - `requestCapability()` / `waitForApproval()`

**Expected:** Capability escalation should wait for the newly requested grant to become active, denied, rejected, or expired.

**Actual:** The SDK polls overall agent status and returns when the agent is already `active` or `claimed`.

**Impact:** If an agent already has an active lower-limit grant, requesting a higher-limit grant returns too early. The next execution fails with `constraint_violated` because the new grant is still pending.

---

### 18. `/agent/status` hides pending escalated grants behind active grants

**Severity:** major  
**Where:** `@better-auth/agent-auth` - `formatGrantsResponse()`

**Expected:** Status should show both the active grant and pending escalated grant when constraints differ.

**Actual:** The formatter deduplicates by capability and prioritizes `active` over `pending`.

**Impact:** Clients cannot reliably poll public status for a specific pending escalation. The pending grant is hidden until it becomes active.

---

### 19. Retrying an existing pending capability request omits approval URL/code

**Severity:** major  
**Where:** `@better-auth/agent-auth` - `requestCapability()`

**Expected:** If a matching pending request already exists, the response should still include enough approval info to show the user where to approve.

**Actual:** The existing-pending branch returns approval metadata such as method, expiry, and interval, but not `verification_uri`, `verification_uri_complete`, or `user_code`.

**Impact:** If the first approval callback is lost or not displayed, retrying the request can leave the client unable to recover the approval URL.

---

### 20. Preconfigured providers can race because constructor writes storage asynchronously

**Severity:** minor  
**Where:** `@auth/agent` - `AgentAuthClient` constructor with `providers`

**Expected:** Preconfigured providers should be available immediately after construction, or setup should require `await init()`.

**Actual:** The constructor seeds provider configs with async storage writes without awaiting them.

**Impact:** A client using async storage can attempt discovery/connection before preconfigured providers are stored.

---

### 21. `init()` silently swallows URL discovery failures

**Severity:** minor  
**Where:** `@auth/agent` - `AgentAuthClient.init()`

**Expected:** If URL discovery fails, the SDK should return failures, log them, or throw when every URL fails.

**Actual:** `init()` uses settled promises and only stores successful results. Failed URLs are silently ignored.

**Impact:** A typo or unreachable provider can leave the client with an empty provider cache and no clear explanation.

---

## C. Package README / Documentation Bugs

### 22. Package READMEs use the wrong install command

**Severity:** docs/polish  
**Where:** `@terminal3/bbs_vc`, `@terminal3/verify_vp`, `@terminal3/vc_core`, `@terminal3/revoke_vc`

**Expected:** READMEs should show `yarn add @terminal3/<package>` or an npm equivalent.

**Actual:** They say:

```bash
yarn install
```

**Impact:** `yarn install` does not add the SDK package to a project.

---

### 23. `@terminal3/bbs_vc` README imports a nonexistent package

**Severity:** major  
**Where:** `@terminal3/bbs_vc` README

**Expected:** Example should import from `@terminal3/bbs_vc`.

**Actual:** The README imports from `@terminal3/bbc_vc`.

**Impact:** Copy-pasting the first BBS example fails immediately.

---

### 24. `@terminal3/bbs_vc` README example uses undefined variables and wrong export names

**Severity:** major  
**Where:** `@terminal3/bbs_vc` README

**Expected:** The issue/verify example should compile.

**Actual:** The example defines `issuerPrivateKey` but uses `privateKey`; calls `createBbsCredential(bbsIssuer, userDid, cred_subject, ...)` without defining those variables; uses `ethers` and `VerificationOptions` without imports; and later calls `verifyBbsVC` even though the package exports `verifyBbsVc` / `verifyBbsVCW3c`.

**Impact:** The main BBS SDK example is not usable as onboarding material.

---

### 25. `@terminal3/vc_core` README example is incomplete and throws

**Severity:** major  
**Where:** `@terminal3/vc_core` README

**Expected:** The example should import everything it uses and pass valid dates.

**Actual:** It imports only `prepareCredentialPayload` but uses `DID`. It also passes `validFrom` as `2022-01-01` and `validUntil` as `2021-01-01`, which the SDK correctly rejects.

**Impact:** The README's basic credential payload example cannot be run as written.

---

### 26. `@terminal3/vc_core` README lists a function name that is not exported

**Severity:** minor  
**Where:** `@terminal3/vc_core` README vs source exports

**Expected:** README function list should match package exports.

**Actual:** README lists `getAddressFromIdentifier`; the source exports `getEthAddressFromIdentifier`.

**Impact:** Developers search for or import the wrong function name.

---

### 27. `@terminal3/revoke_vc` README example is not copy-pasteable

**Severity:** major  
**Where:** `@terminal3/revoke_vc` README

**Expected:** Revocation example should compile and verify revocation correctly.

**Actual:** It imports `verifyBbsVC`, which is not exported by `@terminal3/bbs_vc`; assigns `provider =` and `options =` without declarations; references `vc` and `credential` without defining them; and verifies without passing revocation options.

**Impact:** The revocation package's primary example fails before it can demonstrate revocation.

---

### 28. `@terminal3/verify_vp` README shows verification but not presentation creation

**Severity:** docs/polish  
**Where:** `@terminal3/verify_vp` README

**Expected:** VP verification docs should show how to build or derive the `vp` argument, especially for selective disclosure.

**Actual:** The README only shows:

```ts
const res = await verifyPresentation(vp);
```

It does not show how to generate `vp`, derive a partial credential, or bind a verifier challenge.

**Impact:** Developers can see the verifier entry point but not the holder-side workflow needed to produce the input.

---

### 29. `urls` mode exists in `@auth/agent` but is not documented

**Severity:** docs/polish  
**Where:** `@auth/agent` README vs TypeScript types/source

**Expected:** README should document all supported provider discovery modes.

**Actual:** The client supports `urls?: string[]`, but README examples focus on directory/direct discovery and do not show URL-only startup.

**Impact:** Developers building localhost or direct provider integrations have to inspect package source/types to discover the intended option.

---

### 30. `client.init()` requirement for URL-only discovery is not shown in README examples

**Severity:** docs/polish  
**Where:** `@auth/agent` README vs `AgentAuthClient.init()`

**Expected:** URL-only examples should call `await client.init()`.

**Actual:** The requirement only appears in source comments, not in README examples.

**Impact:** URL-only setup is easy to misconfigure and hard to debug because the provider cache is populated asynchronously through `init()`.

---

## Summary

| # | Finding | Severity | Category |
|---|---------|----------|----------|
| 1 | BBS presentation nonce hardcoded | major | VC SDK / security |
| 2 | No challenge/domain option | major | VC SDK / security |
| 3 | VP holder proof not verified | major | VC SDK / security |
| 4 | No holder-side selective-disclosure API | major | VC SDK |
| 5 | BBS verifier docs describe ECDSA-SD/P256 | minor | VC SDK docs |
| 6 | Revocation ignores credentialStatus unless options passed | major | VC SDK |
| 7 | revokeVC returns before mining | major | VC SDK |
| 8 | No-expiry credentials emit `validUntil: ""` | minor | VC SDK |
| 9 | Empty `validUntil` forced mandatory in BBS | minor | VC SDK |
| 10 | Null/undefined traversal condition impossible | minor | VC SDK |
| 11 | EthrDID default creates `did:ethr::0x...` | major | VC SDK |
| 12 | ECDSA proof uses bare address verificationMethod | minor | VC SDK |
| 13 | revoke_vc provider helper not exported | minor | VC SDK |
| 14 | DID utility accepts malformed DIDs | minor | VC SDK |
| 15 | AI SDK v6 adapter emits old tool shape | major | Agent Auth SDK |
| 16 | Discovery fallback route mismatch | major | Agent Auth SDK/plugin |
| 17 | requestCapability resolves too early | major | Agent Auth SDK |
| 18 | /agent/status hides pending escalations | major | Agent Auth plugin |
| 19 | Pending retry omits approval URL/code | major | Agent Auth plugin |
| 20 | Preconfigured providers async race | minor | Agent Auth SDK |
| 21 | init swallows URL discovery failures | minor | Agent Auth SDK |
| 22 | READMEs use `yarn install` | docs/polish | Docs |
| 23 | bbs_vc README imports `bbc_vc` | major | Docs |
| 24 | bbs_vc README example does not compile | major | Docs |
| 25 | vc_core README example incomplete and invalid | major | Docs |
| 26 | vc_core README lists wrong function name | minor | Docs |
| 27 | revoke_vc README example does not compile | major | Docs |
| 28 | verify_vp README omits VP creation | docs/polish | Docs |
| 29 | @auth/agent `urls` mode undocumented | docs/polish | Docs |
| 30 | @auth/agent URL-mode `init()` missing from README | docs/polish | Docs |

---

## Verification Notes

These claims were checked against the published npm tarballs and installed package source. I excluded live-service claims that were not independently reproduced during this audit.

The strongest issues to prioritize are #1, #2, #3, #4, #6, #7, #15, #16, #17, #18, and #19 because they affect security-sensitive verification, selective disclosure, capability escalation, or SDK interoperability.
