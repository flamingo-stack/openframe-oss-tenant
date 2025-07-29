package com.openframe.sdk.fleetmdm.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Host model from Fleet MDM
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class Host {
    private Long id;
    private String hostname;
    private String uuid;
    private String platform;
    
    @JsonProperty("os_version")
    private String osVersion;
    
    private String build;
    
    @JsonProperty("cpu_brand")
    private String cpuBrand;
    
    @JsonProperty("hardware_vendor")
    private String hardwareVendor;
    
    @JsonProperty("hardware_model")
    private String hardwareModel;
    
    @JsonProperty("hardware_serial")
    private String hardwareSerial;
    
    @JsonProperty("primary_ip")
    private String primaryIp;
    
    @JsonProperty("primary_mac")
    private String primaryMac;
    
    @JsonProperty("team_id")
    private Long teamId;
    
    @JsonProperty("team_name")
    private String teamName;
    
    @JsonProperty("seen_time")
    private String seenTime;
    
    @JsonProperty("created_at")
    private String createdAt;
    
    @JsonProperty("updated_at")
    private String updatedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getHostname() { return hostname; }
    public void setHostname(String hostname) { this.hostname = hostname; }

    public String getUuid() { return uuid; }
    public void setUuid(String uuid) { this.uuid = uuid; }

    public String getPlatform() { return platform; }
    public void setPlatform(String platform) { this.platform = platform; }

    public String getOsVersion() { return osVersion; }
    public void setOsVersion(String osVersion) { this.osVersion = osVersion; }

    public String getBuild() { return build; }
    public void setBuild(String build) { this.build = build; }

    public String getCpuBrand() { return cpuBrand; }
    public void setCpuBrand(String cpuBrand) { this.cpuBrand = cpuBrand; }

    public String getHardwareVendor() { return hardwareVendor; }
    public void setHardwareVendor(String hardwareVendor) { this.hardwareVendor = hardwareVendor; }

    public String getHardwareModel() { return hardwareModel; }
    public void setHardwareModel(String hardwareModel) { this.hardwareModel = hardwareModel; }

    public String getHardwareSerial() { return hardwareSerial; }
    public void setHardwareSerial(String hardwareSerial) { this.hardwareSerial = hardwareSerial; }

    public String getPrimaryIp() { return primaryIp; }
    public void setPrimaryIp(String primaryIp) { this.primaryIp = primaryIp; }

    public String getPrimaryMac() { return primaryMac; }
    public void setPrimaryMac(String primaryMac) { this.primaryMac = primaryMac; }

    public Long getTeamId() { return teamId; }
    public void setTeamId(Long teamId) { this.teamId = teamId; }

    public String getTeamName() { return teamName; }
    public void setTeamName(String teamName) { this.teamName = teamName; }

    public String getSeenTime() { return seenTime; }
    public void setSeenTime(String seenTime) { this.seenTime = seenTime; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }

    public String getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(String updatedAt) { this.updatedAt = updatedAt; }
}
