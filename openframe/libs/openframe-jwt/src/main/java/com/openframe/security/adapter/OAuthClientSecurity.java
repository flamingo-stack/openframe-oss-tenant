package com.openframe.security.adapter;

import java.util.Arrays;
import java.util.Collection;
import java.util.stream.Collectors;

import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import com.openframe.core.model.OAuthClient;

import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
public class OAuthClientSecurity implements UserDetails {

    @Getter
    private final OAuthClient client;

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return Arrays.stream(client.getScopes())
            .map(scope -> new SimpleGrantedAuthority("SCOPE_" + scope))
            .collect(Collectors.toList());
    }

    @Override
    public String getPassword() { return client.getClientSecret(); }

    @Override
    public String getUsername() { return client.getClientId(); }

    @Override
    public boolean isAccountNonExpired() { return true; }

    @Override
    public boolean isAccountNonLocked() { return true; }

    @Override
    public boolean isCredentialsNonExpired() { return true; }

    @Override
    public boolean isEnabled() { return true; }
} 