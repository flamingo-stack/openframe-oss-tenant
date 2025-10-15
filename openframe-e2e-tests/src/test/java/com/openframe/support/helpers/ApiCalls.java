package com.openframe.support.helpers;

import com.openframe.support.enums.ApiEndpoints;
import io.qameta.allure.Step;
import io.qameta.allure.restassured.AllureRestAssured;
import io.restassured.response.Response;
import lombok.extern.slf4j.Slf4j;

import java.util.Map;

import static com.openframe.support.constants.TestConstants.CONTENT_TYPE_JSON;
import static io.restassured.RestAssured.given;

/**
 * Simple API calls wrapper with logging and Allure reporting
 */
@Slf4j
public class ApiCalls {
    @Step("GET {endpoint}")
    public static Response get(ApiEndpoints endpoint, Object... pathParams) {
        String path = pathParams.length > 0 ? 
            endpoint.getPathWithParams(pathParams) : 
            endpoint.getPath();
            
        logRequest("GET", path, null);
        
        Response response = given()
            .filter(new AllureRestAssured())
            .when()
                .get(path);
                
        logResponse(response);
        
        return response;
    }
    
    @Step("GET {endpoint}")
    public static Response get(ApiEndpoints endpoint, Map<String, Object> queryParams) {
        String path = endpoint.getPath();
            
        logRequest("GET", path, queryParams);
        
        Response response = given()
            .filter(new AllureRestAssured())
            .queryParams(queryParams)
            .when()
                .get(path);
                
        logResponse(response);
        
        return response;
    }
    
    @Step("GET {endpoint} with cookies")
    public static Response getWithCookies(ApiEndpoints endpoint, String cookies) {
        String path = endpoint.getPath();
            
        logRequest("GET", path, null);
        
        Response response = given()
            .filter(new AllureRestAssured())
            .header("Cookie", cookies)
            .when()
                .get(path);
                
        logResponse(response);
        
        return response;
    }
    
    @Step("GET {endpoint} with cookies and query params (no redirects)")
    public static Response getWithCookiesAndQueryParams(ApiEndpoints endpoint, String cookies, 
                                                        Map<String, Object> queryParams,
                                                        Object... pathParams) {
        String path = pathParams.length > 0 ? 
            endpoint.getPathWithParams(pathParams) : 
            endpoint.getPath();
            
        logRequest("GET", path, queryParams);
        
        Response response = given()
            .filter(new AllureRestAssured())
            .header("Cookie", cookies)
            .queryParams(queryParams)
            .redirects().follow(false)
            .when()
                .get(path);
                
        logResponse(response);
        
        return response;
    }
    
    @Step("GET {endpoint} with query params (no redirects)")
    public static Response getWithQueryParams(ApiEndpoints endpoint, 
                                              Map<String, Object> queryParams) {
        String path = endpoint.getPath();
            
        logRequest("GET", path, queryParams);
        
        Response response = given()
            .filter(new AllureRestAssured())
            .queryParams(queryParams)
            .redirects().follow(false)
            .when()
                .get(path);
                
        logResponse(response);
        
        return response;
    }
    
    @Step("GET {endpoint} with cookies (no redirects, no URL encoding)")
    public static Response getWithCookiesNoEncoding(String url, String cookies) {
        logRequest("GET", url, null);
        
        Response response = given()
            .filter(new AllureRestAssured())
            .header("Cookie", cookies)
            .redirects().follow(false)
            .urlEncodingEnabled(false)
            .when()
                .get(url);
                
        logResponse(response);
        
        return response;
    }
    
    @Step("POST {endpoint} form data with cookies (no redirects)")
    public static Response postFormWithCookies(ApiEndpoints endpoint, String cookies, 
                                               Map<String, Object> formParams) {
        String path = endpoint.getPath();
        
        logRequest("POST", path, formParams);
        
        Response response = given()
            .filter(new AllureRestAssured())
            .header("Cookie", cookies)
            .formParams(formParams)
            .redirects().follow(false)
            .when()
                .post(path);
                
        logResponse(response);
        
        return response;
    }
    
    @Step("POST {endpoint}")
    public static Response post(ApiEndpoints endpoint, Object requestBody) {
        String path = endpoint.getPath();
        
        logRequest("POST", path, requestBody);
        
        Response response = given()
            .filter(new AllureRestAssured())
            .contentType(CONTENT_TYPE_JSON)
            .body(requestBody)
            .when()
                .post(path);
                
        logResponse(response);
        
        return response;
    }
    
    private static void logRequest(String method, String endpoint, Object requestBody) {
        log.info("Executing {} request to: {}", method, endpoint);
        if (requestBody != null) {
            log.debug("Request body: {}", requestBody);
        }
    }
    
    private static void logResponse(Response response) {
        log.info("Request completed. Status: {}, Response time: {}ms", 
                response.getStatusCode(), response.getTime());
        log.debug("Response body: {}", response.asString());
    }
} 