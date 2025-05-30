package com.openframe.security.adapter;

import java.util.Arrays;
import java.util.Collection;
import java.util.stream.Collectors;
import java.util.stream.Stream;

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
        // Combine scopes and roles into a single collection of authorities
        Stream<GrantedAuthority> scopeAuthorities = Arrays.stream(client.getScopes() != null ? client.getScopes() : new String[0])
            .map(scope -> new SimpleGrantedAuthority("SCOPE_" + scope));
        
        Stream<GrantedAuthority> roleAuthorities = Arrays.stream(client.getRoles() != null ? client.getRoles() : new String[0])
            .map(role -> new SimpleGrantedAuthority("ROLE_" + role));
        
        return Stream.concat(scopeAuthorities, roleAuthorities)
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