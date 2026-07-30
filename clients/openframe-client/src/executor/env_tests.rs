use super::*;

#[test]
fn splits_simple() {
    assert_eq!(split_env("KEY=value"), Some(("KEY", "value")));
}

#[test]
fn keeps_equals_in_value() {
    assert_eq!(split_env("K=a=b"), Some(("K", "a=b")));
}

#[test]
fn rejects_without_equals() {
    assert_eq!(split_env("NOEQ"), None);
}
