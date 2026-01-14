package com.openframe.data.dto.response;

import com.openframe.data.dto.test.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class MeResponse {
    private User user;
    private boolean authenticated;
}
