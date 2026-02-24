use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum Installation {
    Standard {
        #[serde(skip_serializing_if = "Option::is_none")]
        executable_path: Option<String>,
    },
    GuiApp {
        executable_path: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        bundle_id: Option<String>,
    },
    Service {
        service_name: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        executable_path: Option<String>,
    },
}

impl Default for Installation {
    fn default() -> Self {
        Installation::Standard { executable_path: None }
    }
}

impl Installation {
    pub fn executable_path(&self) -> Option<&str> {
        match self {
            Installation::Standard { executable_path } => executable_path.as_deref(),
            Installation::GuiApp { executable_path, .. } => Some(executable_path.as_str()),
            Installation::Service { executable_path, .. } => executable_path.as_deref(),
        }
    }

    pub fn is_standard(&self) -> bool {
        matches!(self, Installation::Standard { .. })
    }

    pub fn is_gui_app(&self) -> bool {
        matches!(self, Installation::GuiApp { .. })
    }

    pub fn is_service(&self) -> bool {
        matches!(self, Installation::Service { .. })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstalledTool {
    pub tool_agent_id: String,
    pub tool_id: String,
    pub tool_type: String,
    pub version: String,
    pub run_command_args: Vec<String>,
    pub tool_agent_id_command_args: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub uninstallation_command_args: Option<Vec<String>>,
    #[serde(default)]
    pub installation: Installation,
}

impl Default for InstalledTool {
    fn default() -> Self {
        Self {
            tool_agent_id: String::new(),
            tool_id: String::new(),
            tool_type: String::new(),
            version: String::new(),
            run_command_args: Vec::new(),
            tool_agent_id_command_args: Vec::new(),
            uninstallation_command_args: None,
            installation: Installation::default(),
        }
    }
}
