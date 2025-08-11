use reqwest::Client;
use anyhow::Result;
use bytes::Bytes;

pub struct ToolAgentFileClient {
    http_client: Client,
    base_url: String,
}

impl ToolAgentFileClient {
    pub fn new(http_client: Client, base_url: String) -> Self {
        Self { http_client, base_url }
    }

    pub async fn get_tool_agent_id(&self, tool_id: String) -> Result<bytes::Bytes> {
        let url = format!("{}/clients/tool-agent/{}", self.base_url, tool_id);
        let response = self.http_client.get(url).send().await?;
        let body = response.bytes().await?; 
        Ok(body)
    }
}