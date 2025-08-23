package com.openframe.authz.controller;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

/**
 * Simple login page controller for multi-tenant OpenFrame
 */
@Controller
public class LoginController {

    @GetMapping("/login")
    public String login(Model model, 
                       @RequestParam(value = "error", required = false) String error,
                       @RequestParam(value = "logout", required = false) String logout) {
        
        if (error != null) {
            model.addAttribute("errorMessage", "Invalid credentials");
        }
        
        if (logout != null) {
            model.addAttribute("logoutMessage", "Logged out successfully");
        }
        
        return "login";
    }

    @GetMapping("/")
    public String index(Model model) {
        model.addAttribute("message", "OpenFrame Multi-Tenant Authorization");
        return "index";
    }
} 