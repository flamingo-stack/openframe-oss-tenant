package com.openframe.authz.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class AuthLoginRedirectController {

    @GetMapping("/auth/login")
    public String redirectToLogin() {
        return "redirect:/login";
    }
}


