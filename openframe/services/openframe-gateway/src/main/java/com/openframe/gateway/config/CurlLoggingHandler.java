package com.openframe.gateway.config;

import java.net.URI;

import io.netty.buffer.ByteBuf;
import io.netty.channel.ChannelDuplexHandler;
import io.netty.channel.ChannelHandlerContext;
import io.netty.channel.ChannelPromise;
import io.netty.handler.codec.http.HttpContent;
import io.netty.handler.codec.http.HttpRequest;
import io.netty.handler.codec.http.LastHttpContent;
import io.netty.util.AttributeKey;
import io.netty.util.internal.StringUtil;
import lombok.extern.slf4j.Slf4j;

@Slf4j
public class CurlLoggingHandler extends ChannelDuplexHandler {
    private final StringBuilder curl = new StringBuilder();
    private boolean isRequest = false;
    private static final AttributeKey<URI> TARGET_URI = AttributeKey.valueOf("target_uri");

    @Override
    public void channelRegistered(ChannelHandlerContext ctx) throws Exception {
        log.info("Channel registered");
        super.channelRegistered(ctx);
    }

    @Override
    public void write(ChannelHandlerContext ctx, Object msg, ChannelPromise promise) throws Exception {
        if (msg instanceof HttpRequest) {
            HttpRequest request = (HttpRequest) msg;
            isRequest = true;
            
            // Start building curl command
            curl.setLength(0);
            
            // Get the target URI from the channel attributes
            URI targetUri = ctx.channel().attr(TARGET_URI).get();
            String fullUrl;
            if (targetUri != null) {
                fullUrl = targetUri.toString() ;
                log.info("Using target URI: {}", targetUri);
            } else {
                log.warn("No target URI found in channel attributes");
                fullUrl = request.uri();
            }
            
            curl.append("curl '").append(fullUrl).append("' \\\n");
            curl.append("  -X '").append(request.method()).append("' \\\n");
            
            // Add headers, excluding the Host header since it's handled by WebClient
            request.headers().forEach(header -> {
                if (!"Host".equalsIgnoreCase(header.getKey())) {
                    curl.append("  -H '")
                        .append(header.getKey())
                        .append(": ")
                        .append(header.getValue())
                        .append("' \\\n");
                }
            });
        }

        if (isRequest && msg instanceof HttpContent) {
            HttpContent content = (HttpContent) msg;
            ByteBuf buffer = content.content();
            if (buffer.isReadable()) {
                String body = buffer.toString(io.netty.util.CharsetUtil.UTF_8);
                if (!StringUtil.isNullOrEmpty(body)) {
                    curl.append("  --data-raw '").append(body).append("'");
                }
            }

            if (msg instanceof LastHttpContent) {
                log.info("Proxied request as curl command: \n{}", curl);
                isRequest = false;
            }
        }

        ctx.write(msg, promise);
    }
} 