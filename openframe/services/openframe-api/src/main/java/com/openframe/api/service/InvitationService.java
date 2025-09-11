package com.openframe.api.service;

import com.openframe.api.dto.invitation.CreateInvitationRequest;
import com.openframe.api.dto.invitation.InvitationPageResponse;
import com.openframe.api.dto.invitation.InvitationResponse;
import com.openframe.api.dto.invitation.UpdateInvitationStatusRequest;
import com.openframe.api.mapper.InvitationMapper;
import com.openframe.data.document.user.Invitation;
import com.openframe.data.document.user.InvitationStatus;
import com.openframe.data.repository.user.InvitationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import static com.openframe.api.dto.invitation.InvitationStatus.REVOKED;

@Service
@RequiredArgsConstructor
@Slf4j
public class InvitationService {

    private final InvitationRepository invitationRepository;
    private final InvitationMapper invitationMapper;

    public InvitationResponse createInvitation(CreateInvitationRequest request) {
        Invitation entity = invitationMapper.toEntity(request);
        Invitation saved = invitationRepository.save(entity);

        // TODO: publish to Kafka (future): invitation-created event
        log.info("Created invitation id={} email={} expiresAt={} ", saved.getId(), saved.getEmail(), saved.getExpiresAt());

        return invitationMapper.toResponse(saved);
    }

    public InvitationPageResponse listInvitations(int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Invitation> p = invitationRepository.findAll(pageable);
        return InvitationPageResponse.builder()
                .items(p.getContent().stream().map(invitationMapper::toResponse).toList())
                .page(p.getNumber())
                .size(p.getSize())
                .totalElements(p.getTotalElements())
                .totalPages(p.getTotalPages())
                .hasNext(p.hasNext())
                .build();
    }

    public InvitationResponse updateInvitationStatus(String id, UpdateInvitationStatusRequest request) {
        Invitation invitation = invitationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Invitation not found"));

        if (!InvitationStatus.PENDING.equals(invitation.getStatus())
                || !REVOKED.equals(request.getStatus())) {
            if (InvitationStatus.REVOKED.equals(invitation.getStatus())
                    && REVOKED.equals(request.getStatus())) {
                return invitationMapper.toResponse(invitation);
            }
            throw new IllegalStateException("Invalid status transition");
        }

        invitation.setStatus(InvitationStatus.REVOKED);
        Invitation saved = invitationRepository.save(invitation);
        // TODO: publish to Kafka (future)
        return invitationMapper.toResponse(saved);
    }
}


