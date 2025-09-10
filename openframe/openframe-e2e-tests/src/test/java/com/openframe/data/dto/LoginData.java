package com.openframe.data.dto;

/**
 * Data Transfer Object for login data
 * Following SRP: Single responsibility for holding login data
 */
public class LoginData {
    private String email;
    
    public LoginData() {}
    
    public LoginData(String email) {
        this.email = email;
    }
    public String getEmail() {
        return email;
    }
    
    public void setEmail(String email) {
        this.email = email;
    }
    
    /**
     * Validate login data
     * @return true if data is valid
     */
    public boolean isValid() {
        return email != null && !email.trim().isEmpty() && email.contains("@");
    }
    
    @Override
    public String toString() {
        return "LoginData{" +
                "email='" + email + '\'' +
                '}';
    }
}

