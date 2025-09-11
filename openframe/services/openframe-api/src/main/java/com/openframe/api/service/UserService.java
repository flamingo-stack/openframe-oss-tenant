package com.openframe.api.service;

import com.openframe.api.dto.user.UserPageResponse;
import com.openframe.api.mapper.UserMapper;
import com.openframe.data.document.user.User;
import com.openframe.data.repository.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final UserMapper userMapper;

    public UserPageResponse listUsers(int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<User> p = userRepository.findAll(pageable);
        return UserPageResponse.builder()
                .items(p.getContent().stream().map(userMapper::toResponse).toList())
                .page(p.getNumber())
                .size(p.getSize())
                .totalElements(p.getTotalElements())
                .totalPages(p.getTotalPages())
                .hasNext(p.hasNext())
                .build();
    }
}


