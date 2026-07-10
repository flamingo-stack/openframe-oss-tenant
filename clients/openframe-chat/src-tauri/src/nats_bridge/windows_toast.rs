// Protocol-activation toasts, hand-built because tauri-winrt-notification
// only supports foreground activation (in-process `Activated` handlers),
// which dies with the process: clicks on toasts left in the Action Center by
// a previous app session went nowhere. `activationType="protocol"` makes the
// OS open the `openframe-chat://notify` URI instead — a warm click reaches
// the running instance through single-instance argv forwarding, a cold click
// launches the app with the URI in argv. Both land in
// `NatsBridge::handle_notification_uri`.

use windows::core::HSTRING;
use windows::Data::Xml::Dom::XmlDocument;
use windows::UI::Notifications::{ToastNotification, ToastNotificationManager};

pub(super) fn show(app_id: &str, title: &str, body: &str, uri: &str) -> windows::core::Result<()> {
    let body_element = if body.is_empty() {
        String::new()
    } else {
        format!("<text>{}</text>", escape_xml(body))
    };
    // Silent to match the previously shipped toasts. The launch attribute
    // covers body clicks; the action covers the Open button.
    let xml = format!(
        r#"<toast duration="short" activationType="protocol" launch="{uri}">
    <visual><binding template="ToastGeneric"><text>{title}</text>{body_element}</binding></visual>
    <audio silent="true"/>
    <actions><action content="Open" activationType="protocol" arguments="{uri}"/></actions>
</toast>"#,
        uri = escape_xml(uri),
        title = escape_xml(title),
    );

    let document = XmlDocument::new()?;
    document.LoadXml(&HSTRING::from(xml.as_str()))?;
    let toast = ToastNotification::CreateToastNotification(&document)?;
    ToastNotificationManager::CreateToastNotifierWithId(&HSTRING::from(app_id))?.Show(&toast)
}

fn escape_xml(value: &str) -> String {
    let mut out = String::with_capacity(value.len());
    for c in value.chars() {
        match c {
            '&' => out.push_str("&amp;"),
            '<' => out.push_str("&lt;"),
            '>' => out.push_str("&gt;"),
            '"' => out.push_str("&quot;"),
            '\'' => out.push_str("&apos;"),
            _ => out.push(c),
        }
    }
    out
}
