// Windows PowerShell 5.1 reads BOM-less script files as ANSI: a multi-byte
// UTF-8 character can decode into a smart quote (e.g. 0x94 from an em-dash)
// that terminates a string early and structurally breaks the script.
#[cfg(target_os = "windows")]
#[test]
fn windows_update_script_is_ascii() {
    assert!(
        super::windows::UPDATE_SCRIPT_WINDOWS.is_ascii(),
        "UPDATE_SCRIPT_WINDOWS must stay pure ASCII"
    );
}

#[cfg(target_os = "macos")]
#[test]
fn macos_update_script_is_ascii() {
    assert!(
        super::macos::UPDATE_SCRIPT_MACOS.is_ascii(),
        "UPDATE_SCRIPT_MACOS must stay pure ASCII"
    );
    assert!(
        super::macos::UPDATER_PLIST_TEMPLATE.is_ascii(),
        "UPDATER_PLIST_TEMPLATE must stay pure ASCII"
    );
}
