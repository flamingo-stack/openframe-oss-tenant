package ai.openframe.analysis.service;

import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.security.GeneralSecurityException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Properties;

import com.google.api.client.auth.oauth2.Credential;
import com.google.api.client.extensions.java6.auth.oauth2.AuthorizationCodeInstalledApp;
import com.google.api.client.extensions.jetty.auth.oauth2.LocalServerReceiver;
import com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeFlow;
import com.google.api.client.googleapis.auth.oauth2.GoogleClientSecrets;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.client.util.store.FileDataStoreFactory;
import com.google.api.services.drive.Drive;
import com.google.api.services.drive.DriveScopes;
import com.google.api.services.drive.model.File;
import com.google.api.services.drive.model.FileList;
import com.google.api.services.sheets.v4.Sheets;
import com.google.api.services.sheets.v4.SheetsScopes;
import com.google.api.services.sheets.v4.model.BatchUpdateSpreadsheetRequest;
import com.google.api.services.sheets.v4.model.BatchUpdateValuesRequest;
import com.google.api.services.sheets.v4.model.CellData;
import com.google.api.services.sheets.v4.model.CellFormat;
import com.google.api.services.sheets.v4.model.Color;
import com.google.api.services.sheets.v4.model.DimensionProperties;
import com.google.api.services.sheets.v4.model.DimensionRange;
import com.google.api.services.sheets.v4.model.GridRange;
import com.google.api.services.sheets.v4.model.RepeatCellRequest;
import com.google.api.services.sheets.v4.model.Request;
import com.google.api.services.sheets.v4.model.Spreadsheet;
import com.google.api.services.sheets.v4.model.SpreadsheetProperties;
import com.google.api.services.sheets.v4.model.TextFormat;
import com.google.api.services.sheets.v4.model.UpdateDimensionPropertiesRequest;
import com.google.api.services.sheets.v4.model.ValueRange;

import ai.openframe.analysis.model.Contributor;

public class GoogleSheetsService {
    private static final String TOKENS_DIRECTORY_PATH = "tokens";
    private static final List<String> SCOPES = Arrays.asList(SheetsScopes.SPREADSHEETS, DriveScopes.DRIVE_FILE);
    private static final SimpleDateFormat DATE_FORMAT = new SimpleDateFormat("MM/dd/yyyy");
    
    private final Sheets sheetsService;
    private final Drive driveService;
    private final String folderId;
    private final String applicationName;
    private final String credentialsFile;
    private Map<String, String> spreadsheetIds = new HashMap<>();
    
    public GoogleSheetsService() throws IOException, GeneralSecurityException {
        Properties props = new Properties();
        try (InputStream input = GoogleSheetsService.class.getClassLoader().getResourceAsStream("config.properties")) {
            props.load(input);
            this.folderId = props.getProperty("google.drive.folderId");
            this.applicationName = props.getProperty("google.application.name");
            this.credentialsFile = "/" + props.getProperty("google.credentials.file");
        }
        
        Credential credentials = getCredentials();
        this.sheetsService = new Sheets.Builder(
            GoogleNetHttpTransport.newTrustedTransport(),
            GsonFactory.getDefaultInstance(),
            credentials)
            .setApplicationName(applicationName)
            .build();
            
        this.driveService = new Drive.Builder(
            GoogleNetHttpTransport.newTrustedTransport(),
            GsonFactory.getDefaultInstance(),
            credentials)
            .setApplicationName(applicationName)
            .build();
    }
    
    private Credential getCredentials() throws IOException, GeneralSecurityException {
        InputStream in = GoogleSheetsService.class.getResourceAsStream(credentialsFile);
        if (in == null) {
            throw new FileNotFoundException("Credentials file not found: " + credentialsFile + ". Please ensure you have placed your Google credentials file in the resources directory.");
        }
        
        GoogleClientSecrets clientSecrets;
        try {
            clientSecrets = GoogleClientSecrets.load(
                GsonFactory.getDefaultInstance(), new InputStreamReader(in));
                
            if (clientSecrets.getDetails().getClientId().isEmpty() || clientSecrets.getDetails().getClientSecret().isEmpty()) {
                throw new IOException("Client secrets file is invalid. Please ensure it contains a valid client_id and client_secret.");
            }
        } catch (IOException e) {
            throw new IOException("Error reading credentials file. Please ensure it's a valid Google OAuth 2.0 client configuration: " + e.getMessage(), e);
        }
            
        GoogleAuthorizationCodeFlow flow = new GoogleAuthorizationCodeFlow.Builder(
            GoogleNetHttpTransport.newTrustedTransport(), GsonFactory.getDefaultInstance(),
            clientSecrets, SCOPES)
            .setDataStoreFactory(new FileDataStoreFactory(new java.io.File(TOKENS_DIRECTORY_PATH)))
            .setAccessType("offline")
            .build();
            
        LocalServerReceiver receiver = new LocalServerReceiver.Builder()
            .setPort(0)  // Use any available port
            .build();
            
        try {
            return new AuthorizationCodeInstalledApp(flow, receiver).authorize("user");
        } catch (IOException e) {
            throw new IOException("Failed to authorize the application. Please ensure you have internet connectivity and have granted the necessary permissions: " + e.getMessage(), e);
        }
    }
    
    private void applySheetFormatting(String spreadsheetId) throws IOException {
        // Create batch update request for formatting
        List<Request> requests = new ArrayList<>();
        
        // Set font to Inter, size 12 for entire sheet and enable text wrapping
        requests.add(new Request()
            .setRepeatCell(new RepeatCellRequest()
                .setRange(new GridRange().setSheetId(0))
                .setCell(new CellData()
                    .setUserEnteredFormat(new CellFormat()
                        .setTextFormat(new TextFormat()
                            .setFontFamily("Inter")
                            .setFontSize(12))
                        .setWrapStrategy("CLIP")
                        .setVerticalAlignment("MIDDLE")))
                .setFields("userEnteredFormat(textFormat,wrapStrategy,verticalAlignment)")));
        
        // Set header row background to gray and center text
        requests.add(new Request()
            .setRepeatCell(new RepeatCellRequest()
                .setRange(new GridRange()
                    .setSheetId(0)
                    .setStartRowIndex(0)
                    .setEndRowIndex(1))
                .setCell(new CellData()
                    .setUserEnteredFormat(new CellFormat()
                        .setBackgroundColor(new Color()
                            .setRed(0.95f)
                            .setGreen(0.95f)
                            .setBlue(0.95f)
                            .setAlpha(1.0f))
                        .setHorizontalAlignment("CENTER")
                        .setVerticalAlignment("MIDDLE")
                        .setWrapStrategy("WRAP")
                        .setTextFormat(new TextFormat()
                            .setFontFamily("Inter")
                            .setFontSize(12)
                            .setBold(true))))
                .setFields("userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,wrapStrategy)")));
        
        // Set row height to 40 pixels
        requests.add(new Request()
            .setUpdateDimensionProperties(new UpdateDimensionPropertiesRequest()
                .setRange(new DimensionRange()
                    .setSheetId(0)
                    .setDimension("ROWS")
                    .setStartIndex(0))
                .setProperties(new DimensionProperties()
                    .setPixelSize(40))
                .setFields("pixelSize")));

        // Set column widths
        int[] columnWidths = {150, 120, 250, 200, 200, 200, 80, 90, 70, 70, 70, 180, 100, 100, 120};
        for (int i = 0; i < columnWidths.length; i++) {
            requests.add(new Request()
                .setUpdateDimensionProperties(new UpdateDimensionPropertiesRequest()
                    .setRange(new DimensionRange()
                        .setSheetId(0)
                        .setDimension("COLUMNS")
                        .setStartIndex(i)
                        .setEndIndex(i + 1))
                    .setProperties(new DimensionProperties()
                        .setPixelSize(columnWidths[i]))
                    .setFields("pixelSize")));
        }
        
        BatchUpdateSpreadsheetRequest requestBody = new BatchUpdateSpreadsheetRequest()
            .setRequests(requests);
        
        sheetsService.spreadsheets().batchUpdate(spreadsheetId, requestBody).execute();
    }
    
    private String getOrCreateSpreadsheet(String city) throws IOException {
        if (spreadsheetIds.containsKey(city)) {
            return spreadsheetIds.get(city);
        }
        
        // First try to find an existing spreadsheet
        try {
            String query = String.format("name='%s Contributors' and mimeType='application/vnd.google-apps.spreadsheet' and '%s' in parents and trashed=false", 
                city, folderId);
            FileList result = driveService.files().list()
                .setQ(query)
                .setSpaces("drive")
                .setFields("files(id, name)")
                .execute();
                
            List<File> files = result.getFiles();
            if (!files.isEmpty()) {
                String spreadsheetId = files.get(0).getId();
                spreadsheetIds.put(city, spreadsheetId);
                applySheetFormatting(spreadsheetId);
                return spreadsheetId;
            }
        } catch (IOException e) {
            System.err.println("Warning: Could not search for existing spreadsheet: " + e.getMessage());
            // Continue to create a new one
        }
        
        // Create new spreadsheet
        try {
            Spreadsheet spreadsheet = new Spreadsheet()
                .setProperties(new SpreadsheetProperties().setTitle(city + " Contributors"));
                
            spreadsheet = sheetsService.spreadsheets().create(spreadsheet)
                .setFields("spreadsheetId")
                .execute();
                
            String spreadsheetId = spreadsheet.getSpreadsheetId();
            
            // Try to move to folder
            try {
                driveService.files().update(spreadsheetId, new com.google.api.services.drive.model.File())
                    .setAddParents(folderId)
                    .setFields("id, parents")
                    .execute();
            } catch (IOException e) {
                System.err.println("Warning: Could not move spreadsheet to folder. It will remain in root directory: " + e.getMessage());
            }
            
            spreadsheetIds.put(city, spreadsheetId);
            
            // Initialize with headers
            ValueRange headers = new ValueRange()
                .setRange("A1:N1")
                .setValues(Collections.singletonList(Arrays.asList(
                    "Username", "Name", "URL", "Email", "LinkedIn", "Website", "Commits", "Java Repos", 
                    "Stars Received", "Stars Given", "Forks", "Latest Commit", "Rank Score", "Last Updated"
                )));
                
            sheetsService.spreadsheets().values()
                .update(spreadsheetId, "A1:N1", headers)
                .setValueInputOption("RAW")
                .execute();
            
            // Apply formatting
            applySheetFormatting(spreadsheetId);
                
            return spreadsheetId;
        } catch (IOException e) {
            throw new IOException("Failed to create spreadsheet: " + e.getMessage() + 
                "\nPlease ensure you have granted the necessary permissions (Sheets and Drive) to the application.", e);
        }
    }
    
    public void updateContributors(List<Contributor> contributors, String city) throws IOException {
        String spreadsheetId = getOrCreateSpreadsheet(city);
        
        // Get existing data
        ValueRange response = sheetsService.spreadsheets().values()
            .get(spreadsheetId, "A2:N")
            .execute();
            
        List<List<Object>> existingData = response.getValues();
        Map<String, Integer> existingRows = new HashMap<>();
        int nextRow = 2; // Start from row 2 (after headers)
        
        if (existingData != null) {
            for (int i = 0; i < existingData.size(); i++) {
                List<Object> row = existingData.get(i);
                if (!row.isEmpty()) {
                    existingRows.put(row.get(0).toString(), i + 2);
                    nextRow = i + 3; // Next available row
                }
            }
        }
        
        // Prepare batch updates
        List<ValueRange> data = new ArrayList<>();
        
        for (Contributor contributor : contributors) {
            List<Object> rowData = Arrays.asList(
                contributor.username(),
                contributor.name(),
                contributor.url(),
                contributor.email(),
                contributor.linkedin(),
                contributor.website(),
                contributor.totalCommits(),
                contributor.javaRepos(),
                contributor.starsReceived(),
                contributor.totalStars(),
                contributor.totalForks(),
                contributor.latestCommitDate() != null ? DATE_FORMAT.format(Date.from(contributor.latestCommitDate())) : "",
                String.format("%.2f", contributor.calculateRankScore()),
                DATE_FORMAT.format(new Date())
            );
            
            Integer existingRow = existingRows.get(contributor.username());
            if (existingRow != null) {
                data.add(new ValueRange()
                    .setRange("A" + existingRow + ":N" + existingRow)
                    .setValues(Collections.singletonList(rowData)));
            } else {
                data.add(new ValueRange()
                    .setRange("A" + nextRow + ":N" + nextRow)
                    .setValues(Collections.singletonList(rowData)));
                nextRow++;
            }
        }
        
        if (!data.isEmpty()) {
            BatchUpdateValuesRequest batchBody = new BatchUpdateValuesRequest()
                .setValueInputOption("RAW")
                .setData(data);
                
            sheetsService.spreadsheets().values()
                .batchUpdate(spreadsheetId, batchBody)
                .execute();
        }
            
        System.out.println("Updated " + contributors.size() + " contributors in Google Sheets for " + city);
    }
    
    public void ensureSheetExists(String city) throws IOException {
        getOrCreateSpreadsheet(city);
    }
    
    public void createConsolidatedSheet() throws IOException {
        // Create or get the consolidated spreadsheet
        String spreadsheetId = getOrCreateSpreadsheet("All South Florida");
        
        // Initialize with headers including city
        ValueRange headers = new ValueRange()
            .setRange("A1:O1")
            .setValues(Collections.singletonList(Arrays.asList(
                "Username", "Name", "URL", "Email", "LinkedIn", "Website", "Commits", "Java Repos", 
                "Stars Received", "Stars Given", "Forks", "Latest Commit", "Rank Score", "Last Updated", "City"
            )));
            
        sheetsService.spreadsheets().values()
            .update(spreadsheetId, "A1:O1", headers)
            .setValueInputOption("RAW")
            .execute();
            
        // Collect all contributors from each city
        Map<String, List<Object>> uniqueContributors = new HashMap<>(); // Username -> Row data
        
        for (Map.Entry<String, String> entry : spreadsheetIds.entrySet()) {
            String city = entry.getKey();
            if (city.equals("All South Florida")) continue; // Skip the consolidated sheet
            
            String citySpreadsheetId = entry.getValue();
            
            // Get data from city sheet
            ValueRange response = sheetsService.spreadsheets().values()
                .get(citySpreadsheetId, "A2:N")
                .execute();
                
            List<List<Object>> cityData = response.getValues();
            if (cityData != null) {
                for (List<Object> row : cityData) {
                    String username = row.get(0).toString();
                    List<Object> newRow = new ArrayList<>(row);
                    newRow.add(city);
                    
                    // If we already have this contributor, keep the one with the higher rank score
                    if (uniqueContributors.containsKey(username)) {
                        double existingScore = Double.parseDouble(((String) uniqueContributors.get(username).get(12)).replace(",", ""));
                        double newScore = Double.parseDouble(((String) row.get(12)).replace(",", ""));
                        
                        if (newScore > existingScore) {
                            uniqueContributors.put(username, newRow);
                        }
                    } else {
                        uniqueContributors.put(username, newRow);
                    }
                }
            }
        }
        
        // Convert map to list and sort by rank score
        List<List<Object>> allData = new ArrayList<>(uniqueContributors.values());
        Collections.sort(allData, (a, b) -> {
            double scoreA = Double.parseDouble(((String) a.get(12)).replace(",", ""));
            double scoreB = Double.parseDouble(((String) b.get(12)).replace(",", ""));
            return Double.compare(scoreB, scoreA);
        });
        
        // Update consolidated sheet
        if (!allData.isEmpty()) {
            ValueRange body = new ValueRange()
                .setRange("A2:O" + (allData.size() + 1))
                .setValues(allData);
                
            sheetsService.spreadsheets().values()
                .update(spreadsheetId, "A2:O" + (allData.size() + 1), body)
                .setValueInputOption("RAW")
                .execute();
        }
        
        // Apply formatting
        applySheetFormatting(spreadsheetId);
        
        System.out.println("Created consolidated sheet with " + allData.size() + " unique contributors");
    }
} 