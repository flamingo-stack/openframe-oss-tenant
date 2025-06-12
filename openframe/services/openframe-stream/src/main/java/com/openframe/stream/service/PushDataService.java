package com.openframe.stream.service;

import com.openframe.stream.enumeration.DownstreamTool;
import com.openframe.data.model.DownstreamEntity;

public interface PushDataService {

    DownstreamTool getDownstreamToolName();

    void pushData(DownstreamEntity downstreamEntity);

}
