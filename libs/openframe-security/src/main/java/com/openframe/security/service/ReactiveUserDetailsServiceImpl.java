// package com.openframe.security.service;

// import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
// import org.springframework.security.core.userdetails.ReactiveUserDetailsService;
// import org.springframework.security.core.userdetails.UserDetails;
// import org.springframework.security.core.userdetails.UsernameNotFoundException;
// import org.springframework.stereotype.Service;

// import com.openframe.data.repository.mongo.ReactiveUserRepository;

// import lombok.RequiredArgsConstructor;
// import lombok.extern.slf4j.Slf4j;
// import reactor.core.publisher.Mono;

// @Slf4j
// @Service
// @RequiredArgsConstructor
// @ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.REACTIVE)
// public class ReactiveUserDetailsServiceImpl implements ReactiveUserDetailsService {

//     private final ReactiveUserRepository userRepository;

//     @Override
//     public Mono<UserDetails> findByUsername(String username) {
//         log.debug("Finding user by username: {}", username);
//         return userRepository.findByEmail(username)
//             .switchIfEmpty(Mono.error(new UsernameNotFoundException("User not found: " + username)))
//             .cast(UserDetails.class)
//             .doOnSuccess(user -> log.debug("Found user: {}", user))
//             .doOnError(e -> log.error("Error finding user: {}", e.getMessage()));
//     }
// } 