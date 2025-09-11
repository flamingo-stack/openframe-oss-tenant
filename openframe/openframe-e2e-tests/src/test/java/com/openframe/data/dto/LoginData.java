package com.openframe.data.dto;


import lombok.Data;

@Data
public class LoginData {
    private String email;
    
    public LoginData() {}
    
    public LoginData(String email) {
        this.email = email;
    }

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

