package com.openframe.stream.service;

import com.openframe.stream.DownstreamTool;
import com.openframe.data.model.DownstreamEntity;

public interface PushDataService {

    DownstreamTool getDownstreamToolName();

    void pushData(DownstreamEntity downstreamEntity);

}
