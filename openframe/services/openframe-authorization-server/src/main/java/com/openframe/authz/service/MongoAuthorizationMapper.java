package com.openframe.authz.service;

import com.openframe.data.document.oauth.MongoOAuth2Authorization;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.OAuth2AccessToken;
import org.springframework.security.oauth2.core.OAuth2RefreshToken;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;
import org.springframework.security.oauth2.server.authorization.OAuth2Authorization;
import org.springframework.security.oauth2.server.authorization.OAuth2AuthorizationCode;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClientRepository;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;

class MongoAuthorizationMapper {
    static MongoOAuth2Authorization toEntity(OAuth2Authorization auth) {
        MongoOAuth2Authorization entity = new MongoOAuth2Authorization();
        entity.setId(auth.getId());
        entity.setRegisteredClientId(auth.getRegisteredClientId());
        entity.setPrincipalName(auth.getPrincipalName());
        entity.setAuthorizationGrantType(auth.getAuthorizationGrantType().getValue());

        // Store OAuth2AuthorizationRequest with PKCE
        OAuth2AuthorizationRequest authRequest = auth.getAttribute(OAuth2AuthorizationRequest.class.getName());
        if (authRequest != null) {
            entity.setArClientId(authRequest.getClientId());
            entity.setArAuthorizationUri(authRequest.getAuthorizationUri());
            entity.setArRedirectUri(authRequest.getRedirectUri());
            entity.setArScopes(authRequest.getScopes() != null ? String.join(" ", authRequest.getScopes()) : null);
            entity.setArState(authRequest.getState());

            // Store all additional parameters including PKCE
            Map<String, String> additional = new HashMap<>();
            authRequest.getAdditionalParameters().forEach((k, v) -> {
                if (v != null) {
                    additional.put(k, v.toString());
                }
            });

            // Also check authorization code metadata for PKCE
            OAuth2Authorization.Token<OAuth2AuthorizationCode> code = auth.getToken(OAuth2AuthorizationCode.class);
            if (code != null && code.getMetadata() != null) {
                code.getMetadata().forEach((k, v) -> {
                    if (v != null && (k.equals("code_challenge") || k.equals("code_challenge_method"))) {
                        additional.put(k, v.toString());
                    }
                });
            }

            entity.setArAdditional(additional);
        }
        entity.setState(auth.getAttribute("state"));

        OAuth2Authorization.Token<OAuth2AuthorizationCode> code = auth.getToken(OAuth2AuthorizationCode.class);
        if (code != null) {
            entity.setAuthorizationCodeValue(code.getToken().getTokenValue());
            entity.setAuthorizationCodeIssuedAt(code.getToken().getIssuedAt());
            entity.setAuthorizationCodeExpiresAt(code.getToken().getExpiresAt());
            entity.setAuthorizationCodeMetadata(code.getMetadata());
        }

        OAuth2Authorization.Token<OAuth2AccessToken> access = auth.getToken(OAuth2AccessToken.class);
        if (access != null) {
            entity.setAccessTokenValue(access.getToken().getTokenValue());
            entity.setAccessTokenIssuedAt(access.getToken().getIssuedAt());
            entity.setAccessTokenExpiresAt(access.getToken().getExpiresAt());
            entity.setAccessTokenType(access.getToken().getTokenType().getValue());
            Set<String> scopes = access.getToken().getScopes();
            entity.setAccessTokenScopes(scopes != null ? String.join(" ", scopes) : null);
            entity.setAccessTokenMetadata(access.getMetadata());
        }

        OAuth2Authorization.Token<OAuth2RefreshToken> refresh = auth.getToken(OAuth2RefreshToken.class);
        if (refresh != null) {
            entity.setRefreshTokenValue(refresh.getToken().getTokenValue());
            entity.setRefreshTokenIssuedAt(refresh.getToken().getIssuedAt());
            entity.setRefreshTokenExpiresAt(refresh.getToken().getExpiresAt());
            entity.setRefreshTokenMetadata(refresh.getMetadata());
        }

        // Set TTL
        entity.updateExpiresAt();

        return entity;
    }

    static OAuth2Authorization toDomain(MongoOAuth2Authorization e, RegisteredClientRepository clients) {
        OAuth2Authorization.Builder b = OAuth2Authorization.withRegisteredClient(
                        clients.findById(e.getRegisteredClientId()))
                .id(e.getId())
                .principalName(e.getPrincipalName())
                .authorizationGrantType(new org.springframework.security.oauth2.core.AuthorizationGrantType(e.getAuthorizationGrantType()))
                .attributes(attrs -> {
                    if (e.getState() != null) attrs.put("state", e.getState());
                    // Rehydrate principal for token exchange (not persisted)
                    Authentication principal = new UsernamePasswordAuthenticationToken(e.getPrincipalName(), "N/A", java.util.Collections.emptyList());
                    attrs.put(java.security.Principal.class.getName(), principal);
                    // Ensure PKCE is also available directly on authorization attributes (underscore keys)
                    if (e.getArAdditional() != null) {
                        String cc = e.getArAdditional().get("code_challenge");
                        if (cc != null) attrs.put("code_challenge", cc);
                        String ccm = e.getArAdditional().get("code_challenge_method");
                        if (ccm != null) attrs.put("code_challenge_method", ccm);
                    }
                    // Rebuild OAuth2AuthorizationRequest if snapshot present
                    if (e.getArClientId() != null) {
                        OAuth2AuthorizationRequest.Builder reqBuilder = OAuth2AuthorizationRequest.authorizationCode()
                                .clientId(e.getArClientId());
                        if (e.getArAuthorizationUri() != null) reqBuilder.authorizationUri(e.getArAuthorizationUri());
                        if (e.getArRedirectUri() != null) reqBuilder.redirectUri(e.getArRedirectUri());
                        if (e.getArScopes() != null) reqBuilder.scopes(Set.of(e.getArScopes().split(" ")));
                        if (e.getArState() != null) reqBuilder.state(e.getArState());
                        if (e.getArAdditional() != null || e.getAuthorizationCodeMetadata() != null) {
                            java.util.Map<String, Object> params = new java.util.HashMap<>();
                            // Start with whatever was stored (may contain dot-restored keys)
                            if (e.getArAdditional() != null) {
                                e.getArAdditional().forEach((k, v) -> params.put(k, String.valueOf(v)));
                            }

                            // Normalize PKCE from metadata (underscore source)
                            if (e.getAuthorizationCodeMetadata() != null) {
                                Object ccMeta = e.getAuthorizationCodeMetadata().get("code_challenge");
                                if (ccMeta != null) params.put("code_challenge", String.valueOf(ccMeta));
                                Object ccmMeta = e.getAuthorizationCodeMetadata().get("code_challenge_method");
                                if (ccmMeta != null) params.put("code_challenge_method", String.valueOf(ccmMeta));
                            }

                            // Normalize PKCE from arAdditional (handle both forms due to dot replacement reversal)
                            if (e.getArAdditional() != null) {
                                String cc = e.getArAdditional().get("code_challenge");
                                if (cc == null) cc = e.getArAdditional().get("code.challenge");
                                if (cc != null) {
                                    params.put("code_challenge", cc);
                                    params.put("code.challenge", cc);
                                }
                                String ccm = e.getArAdditional().get("code_challenge_method");
                                if (ccm == null) ccm = e.getArAdditional().get("code.challenge.method");
                                if (ccm != null) {
                                    params.put("code_challenge_method", ccm);
                                    params.put("code.challenge.method", ccm);
                                }
                            }

                            reqBuilder.additionalParameters(params);
                        }
                        attrs.put(OAuth2AuthorizationRequest.class.getName(), reqBuilder.build());
                    }
                });

        if (e.getAuthorizationCodeValue() != null) {
            OAuth2AuthorizationCode code = new OAuth2AuthorizationCode(
                    e.getAuthorizationCodeValue(),
                    e.getAuthorizationCodeIssuedAt(),
                    e.getAuthorizationCodeExpiresAt()
            );

            // Build code metadata ensuring PKCE keys are present with underscores
            java.util.Map<String, Object> codeMeta = new java.util.HashMap<>();
            if (e.getAuthorizationCodeMetadata() != null) {
                codeMeta.putAll(e.getAuthorizationCodeMetadata());
            }
            if (e.getArAdditional() != null) {
                String cc = e.getArAdditional().get("code_challenge");
                if (cc != null) {
                    codeMeta.put("code_challenge", cc);
                }
                String ccm = e.getArAdditional().get("code_challenge_method");
                if (ccm != null) {
                    codeMeta.put("code_challenge_method", ccm);
                }
            }

            b.token(code, meta -> meta.putAll(codeMeta));
        }
        if (e.getAccessTokenValue() != null) {
            OAuth2AccessToken access = new OAuth2AccessToken(OAuth2AccessToken.TokenType.BEARER, e.getAccessTokenValue(), e.getAccessTokenIssuedAt(), e.getAccessTokenExpiresAt(),
                    e.getAccessTokenScopes() != null ? Set.of(e.getAccessTokenScopes().split(" ")) : null);
            b.token(access, meta -> meta.putAll(e.getAccessTokenMetadata()));
        }
        if (e.getRefreshTokenValue() != null) {
            OAuth2RefreshToken refresh = new OAuth2RefreshToken(e.getRefreshTokenValue(), e.getRefreshTokenIssuedAt(), e.getRefreshTokenExpiresAt());
            b.token(refresh, meta -> meta.putAll(e.getRefreshTokenMetadata()));
        }
        return b.build();
    }

}
