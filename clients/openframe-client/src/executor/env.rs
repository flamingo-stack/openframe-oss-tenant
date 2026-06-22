use tokio::process::Command;

pub(crate) fn split_env(var: &str) -> Option<(&str, &str)> {
    var.split_once('=')
}

pub(crate) fn apply_env_vars(cmd: &mut Command, env_vars: &[String]) {
    for var in env_vars {
        match split_env(var) {
            Some((key, value)) if !key.is_empty() => {
                cmd.env(key, value);
            }
            _ => {
                tracing::warn!(var = %var, "skipping malformed env var (empty name or missing '=')");
            }
        }
    }
}

#[cfg(test)]
mod tests {
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
}
