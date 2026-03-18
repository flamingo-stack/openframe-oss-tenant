use tracing::{info, warn};
use winreg::enums::*;
use winreg::{RegKey, RegValue};

/// One-time migration: repair PATH registry value type.
///
/// Previous versions of OpenFrame used `set_value()` which writes REG_SZ,
/// converting the original REG_EXPAND_SZ type. This breaks %SystemRoot%
/// and similar variable expansion in PATH, making system tools like
/// ping.exe, ipconfig.exe etc. unreachable.
///
/// This function checks if PATH is REG_SZ with unexpanded %variables%
/// and converts it back to REG_EXPAND_SZ. Safe to call on every startup —
/// does nothing if the type is already correct.
pub fn run() {
    let result = (|| -> anyhow::Result<()> {
        let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
        let env = hklm.open_subkey_with_flags(
            "SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment",
            KEY_READ | KEY_WRITE,
        )?;

        let raw_value = env.get_raw_value("Path")?;
        if raw_value.vtype != RegType::REG_SZ {
            return Ok(());
        }

        let path_str = String::from_utf16_lossy(
            &raw_value.bytes
                .chunks_exact(2)
                .map(|c| u16::from_le_bytes([c[0], c[1]]))
                .collect::<Vec<u16>>(),
        )
        .trim_end_matches('\0')
        .to_string();

        if !path_str.contains('%') {
            return Ok(());
        }

        info!("Repairing PATH registry type: REG_SZ -> REG_EXPAND_SZ");

        let mut bytes: Vec<u8> = path_str.encode_utf16().flat_map(|c| c.to_le_bytes()).collect();
        bytes.push(0);
        bytes.push(0);

        env.set_raw_value("Path", &RegValue {
            vtype: RegType::REG_EXPAND_SZ,
            bytes,
        })?;

        info!("PATH registry type repaired successfully");
        Ok(())
    })();

    if let Err(e) = result {
        warn!("Failed to check/repair PATH registry type: {}", e);
    }
}
