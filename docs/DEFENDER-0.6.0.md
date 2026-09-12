# Defender investigation: Nexume 0.6.0

Date: 2026-09-12. Reported detection: `Trojan:Win32/Bearfoos.B!ml` on the Windows setup executable on another computer running Windows 10 (confirmed by the user).

Status: **not reproduced locally; false positive is not confirmed**. Do not treat this report as a security certification or override an active detection.

## Files checked

| File | SHA-256 |
| --- | --- |
| Nexume-0.6.0-windows-x64-setup.exe | `3ECC1AE992119E962A2ECD05FF54A4830C4F312C253B7A198FFFEB379D57D3AA` |
| Nexume-0.6.0-windows-x64.exe | `C13D4C51D804B0EA1565F56D323D44804689573A124D44AF2C7CC788C2F86D4C` |

Both release files match their original build outputs in `src-tauri/target/release` and the existing release checksum manifest. Both have Authenticode status `NotSigned`. These comparisons establish consistency between local copies, not independent provenance or absence of malware. The affected computer's file hash has not been obtained.

## Local scan results

Microsoft Defender real-time protection and antivirus were enabled. No threat records were returned by the local `Get-MpThreatDetection` query. The platform was `4.18.26080.3`, engine `1.1.26080.3`.

The installer scan with definitions `1.459.165.0` reported no threats. A successful signature update installed `1.459.166.0`. Separate subsequent scans of the installer and application executable both explicitly reported `found no threats`.

Scans used the installed Microsoft `MpCmdRun.exe` with `-Scan -ScanType 3 -File <absolute file path> -DisableRemediation`. This diagnostic mode scans archives and ignores file exclusions, reports detections to command output, and does not apply remediation for that scan. No protection settings or exclusions were changed. Neither Nexume executable was launched.

## Source and packaging review

At commit `8c2f633`, the native entry point launches the Tauri application. The build script calls `tauri_build::build()`. Packaging uses Tauri's NSIS current-user installer configuration, without configured custom installer hooks. Native commands handle local SQLite state/preferences, bounded AniList image caching and user-selected backup import/export. The reviewed application source contains no shell/process execution or startup-persistence implementation. Rust lockfile dependency sources are crates.io. The JavaScript lockfile inspection found no custom tarball, Git, or local-file dependency overrides.

This was a limited source/configuration review, not a full dependency audit, binary reverse engineering, independent reproducible build, or behavioral sandbox analysis. An unsigned installer alone does not explain this malware classification.

## Next steps on the affected computer

1. Keep the detected installer blocked/quarantined. Update Defender security intelligence and record the detection time, definition version, affected path and release version from Protection history.
2. If a copy remains accessible without restoring it from quarantine, compare its SHA-256 using `Get-FileHash -LiteralPath '<path to setup.exe>' -Algorithm SHA256` against the installer hash above. A mismatch requires investigating the actual file; it is not evidence that the local build is malicious or safe.
3. If detection persists for the matching file, submit that exact installer to Microsoft for analysis as the software developer. Include the detection name, hashes, local scan results and affected-machine details. The file has **not** been uploaded by this investigation. Microsoft must assess whether the classification needs correction.

Suggested submission description:

> Nexume 0.6.0 is a local-first anime library built with Rust/Tauri and React. A user reports Trojan:Win32/Bearfoos.B!ml on its unsigned NSIS setup executable. The installer SHA-256 is 3ECC1AE992119E962A2ECD05FF54A4830C4F312C253B7A198FFFEB379D57D3AA. Local custom Defender scans reported no threats with definitions 1.459.165.0 and 1.459.166.0. Please investigate whether this is an incorrect detection. No conclusion about the reported sample has been confirmed.

References: [Microsoft file submission](https://www.microsoft.com/en-us/wdsi/filesubmission), [Microsoft threat description](https://www.microsoft.com/en-us/wdsi/threats/malware-encyclopedia-description?Name=Trojan%3AWin32%2FBearfoos.B%21ml), [Defender command-line scan documentation](https://learn.microsoft.com/en-us/defender-endpoint/command-line-arguments-microsoft-defender-antivirus).
