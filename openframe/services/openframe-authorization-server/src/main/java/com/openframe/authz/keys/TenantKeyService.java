package com.openframe.authz.keys;

import com.nimbusds.jose.jwk.RSAKey;
import com.openframe.core.service.EncryptionService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TenantKeyService {
    private final MongoTemplate mongoTemplate;
    private final EncryptionService encryptionService;

    public RSAKey getOrCreateActiveKey(String tenantId) {
        Query q = new Query(Criteria.where("tenantId").is(tenantId).and("active").is(true));
        TenantKeyDocument doc = mongoTemplate.findOne(q, TenantKeyDocument.class, "tenant_keys");
        if (doc == null) {
            doc = createAndStore(tenantId);
        }
        RSAPublicKey pub = PemUtil.parsePublicKey(doc.getPublicPem());
        RSAPrivateKey priv = PemUtil.parsePrivateKey(encryptionService.decryptClientSecret(doc.getPrivateEncrypted()));
        return new RSAKey.Builder(pub).privateKey(priv).keyID(doc.getKeyId()).build();
    }

    private TenantKeyDocument createAndStore(String tenantId) {
        try {
            KeyPairGenerator kpg = KeyPairGenerator.getInstance("RSA");
            kpg.initialize(2048);
            KeyPair kp = kpg.generateKeyPair();
            String pubPem = PemUtil.toPublicPem((RSAPublicKey) kp.getPublic());
            String privPem = PemUtil.toPrivatePem((RSAPrivateKey) kp.getPrivate());
            String enc = encryptionService.encryptClientSecret(privPem);
            TenantKeyDocument doc = new TenantKeyDocument();
            doc.setId(UUID.randomUUID().toString());
            doc.setTenantId(tenantId);
            doc.setKeyId("kid-" + UUID.randomUUID());
            doc.setPublicPem(pubPem);
            doc.setPrivateEncrypted(enc);
            doc.setActive(true);
            doc.setCreatedAt(Instant.now());
            mongoTemplate.save(doc, "tenant_keys");
            return doc;
        } catch (Exception e) {
            throw new IllegalStateException("Failed to generate tenant key", e);
        }
    }
}


