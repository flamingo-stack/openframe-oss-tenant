package com.openframe.data.model.nats;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ClientConnectionEvent {

    private String timestamp;
    private Client client;
//    private String reason;

    @Getter
    @Setter
    public static class Client {

//        private String start;
//        private String stop;
        private String name;


    }

}
