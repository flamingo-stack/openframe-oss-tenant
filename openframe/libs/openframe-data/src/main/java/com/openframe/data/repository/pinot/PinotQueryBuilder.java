package com.openframe.data.repository.pinot;

import com.openframe.data.repository.pinot.exception.PinotQueryException;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.time.ZoneId;

//TODO need to be unified for Pinot device functionality
public class PinotQueryBuilder {
    
    public static final int FIRST_COLUMN_INDEX = 0;
    public static final int FIRST_RESULT_SET_INDEX = 0;
    
    private static final String SQL_SELECT = "SELECT ";
    private static final String SQL_DISTINCT = "DISTINCT ";
    private static final String SQL_FROM = " FROM ";
    private static final String SQL_WHERE = " WHERE ";
    private static final String SQL_ORDER_BY = " ORDER BY ";
    private static final String SQL_LIMIT = " LIMIT ";
    private static final String SQL_GROUP_BY = " GROUP BY ";
    private static final String SQL_AND = " AND ";
    private static final String SQL_LIKE = " LIKE ";
    private static final String SQL_OR = " OR ";
    private static final String SQL_GREATER_THAN = " > ";
    private static final String SQL_EQUALS = " = ";
    private static final String SQL_NOT_EQUALS = " != ";
    private static final String SQL_GREATER_EQUAL = " >= ";
    private static final String SQL_LESS_EQUAL = " <= ";
    private static final String SQL_IN = " IN ";
    private static final String SQL_COUNT_ALL = "COUNT(*)";
    private static final String SQL_COUNT_ALIAS = "count";
    private static final String SQL_AS = " as ";
    private static final String SQL_DESC = " DESC";
    private static final String SQL_ASC = " ASC";
    
    private static final String TEXT_MATCH_FUNCTION = "TEXT_MATCH";
    private static final String EVENT_TIMESTAMP_FIELD = "eventTimestamp";
    private static final String TIMESTAMP_DESC = EVENT_TIMESTAMP_FIELD + SQL_DESC;
    private static final String TIMESTAMP_ASC = EVENT_TIMESTAMP_FIELD + SQL_ASC;
    
    private static final int INITIAL_QUERY_BUFFER_SIZE = 256;
    private static final String DATE_FORMAT_PATTERN = "yyyy-MM-dd";
    private static final String WILDCARD_PATTERN = "%";
    private static final String SINGLE_QUOTE = "'";
    private static final String DOUBLE_QUOTE = "''";
    private static final String BACKSLASH = "\\";
    private static final String DOUBLE_BACKSLASH = "\\\\";
    
    private static final int MAX_LIMIT = 10000;
    private static final int MIN_LIMIT = 1;

    private static final String CURSOR_SEPARATOR = "_";
    private static final String CURSOR_TIMESTAMP_LESS_CONDITION = "(%s < %d)";
    private static final String CURSOR_TIMESTAMP_EQUAL_CONDITION = "(%s = %d AND toolEventId <> %s%s%s)";
    
    private static final LocalTime END_OF_DAY = LocalTime.MAX;
    
    private final String tableName;
    private final List<String> selectColumns = new ArrayList<>();
    private final List<String> whereConditions = new ArrayList<>();
    private final List<String> orderByColumns = new ArrayList<>();
    private final List<String> groupByColumns = new ArrayList<>();
    private boolean isDistinct = false;
    private boolean isCountQuery = false;
    private Integer limit = null;

    private final DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern(DATE_FORMAT_PATTERN);
    
    public PinotQueryBuilder(String tableName) {
        validateTableName(tableName);
        this.tableName = tableName;
    }
    
    public PinotQueryBuilder select(String... columns) {
        validateColumns(columns);
        selectColumns.addAll(Arrays.asList(columns));
        return this;
    }
    
    public PinotQueryBuilder distinct() {
        this.isDistinct = true;
        return this;
    }
    
    public PinotQueryBuilder selectCount() {
        this.isCountQuery = true;
        selectColumns.add(SQL_COUNT_ALL + SQL_AS + SQL_COUNT_ALIAS);
        return this;
    }
    
    public PinotQueryBuilder selectCountAll() {
        this.isCountQuery = true;
        selectColumns.add(SQL_COUNT_ALL);
        return this;
    }
    
    public PinotQueryBuilder where(String condition) {
        if (condition != null && !condition.trim().isEmpty()) {
            whereConditions.add(condition.trim());
        }
        return this;
    }
    
    public PinotQueryBuilder whereEquals(String field, String value) {
        validateFieldName(field);
        return where(buildCondition(field, value, SQL_EQUALS));
    }
    
    public PinotQueryBuilder whereGreaterThan(String field, String value) {
        validateFieldName(field);
        return where(buildCondition(field, value, SQL_GREATER_THAN));
    }
    
    public PinotQueryBuilder whereDateRange(String field, LocalDate startDate, LocalDate endDate) {
        validateFieldName(field);
        String dateCondition = buildDateRangeCondition(field, startDate, endDate);
        return where(dateCondition);
    }
    
    public PinotQueryBuilder whereTextSearch(String searchTerm, String... columns) {
        validateColumns(columns);
        if (searchTerm != null && !searchTerm.trim().isEmpty()) {
            String textMatchCondition = buildTextMatchCondition(searchTerm.trim(), columns);
            whereConditions.add("(" + textMatchCondition + ")");
        }
        return this;
    }

    public PinotQueryBuilder whereLike(String field, String value) {
        validateFieldName(field);
        if (value != null && !value.trim().isEmpty()) {
            whereConditions.add(field + SQL_LIKE + SINGLE_QUOTE + WILDCARD_PATTERN + 
                              escapeSqlValue(value.trim()) + WILDCARD_PATTERN + SINGLE_QUOTE);
        }
        return this;
    }
    
    public PinotQueryBuilder whereGreaterThanOrEqual(String field, String value) {
        validateFieldName(field);
        return where(buildCondition(field, value, SQL_GREATER_EQUAL));
    }
    
    public PinotQueryBuilder whereLessThanOrEqual(String field, String value) {
        validateFieldName(field);
        return where(buildCondition(field, value, SQL_LESS_EQUAL));
    }
    
    public PinotQueryBuilder whereNotEquals(String field, String value) {
        validateFieldName(field);
        if (value != null && !value.trim().isEmpty()) {
            whereConditions.add(field + SQL_NOT_EQUALS + SINGLE_QUOTE + escapeSqlValue(value.trim()) + SINGLE_QUOTE);
        }
        return this;
    }
    
    public PinotQueryBuilder whereIn(String field, List<String> values) {
        validateFieldName(field);
        if (values != null && !values.isEmpty()) {
            String inValues = values.stream()
                .map(value -> SINGLE_QUOTE + escapeSqlValue(value.trim()) + SINGLE_QUOTE)
                .collect(Collectors.joining(", "));
            whereConditions.add(field + SQL_IN + "(" + inValues + ")");
        }
        return this;
    }
    
    public PinotQueryBuilder whereIn(String field, String... values) {
        return whereIn(field, values != null ? Arrays.asList(values) : null);
    }
    
    public PinotQueryBuilder whereOr(String field, List<String> values) {
        validateFieldName(field);
        if (values != null && !values.isEmpty()) {
            String orCondition = values.stream()
                .map(value -> field + SQL_EQUALS + SINGLE_QUOTE + escapeSqlValue(value.trim()) + SINGLE_QUOTE)
                .collect(Collectors.joining(SQL_OR));
            whereConditions.add("(" + orCondition + ")");
        }
        return this;
    }
    
    public PinotQueryBuilder whereOr(String field, String... values) {
        return whereOr(field, values != null ? Arrays.asList(values) : null);
    }
    
    public PinotQueryBuilder whereFilterOptionsExcluding(String field, List<String> values, 
                                                       String excludeField, 
                                                       Map<String, List<String>> otherFilters) {
        validateFieldName(field);
        if (values != null && !values.isEmpty() && !field.equals(excludeField)) {
            whereIn(field, values);
        }
        if (otherFilters != null) {
            for (Map.Entry<String, List<String>> entry : otherFilters.entrySet()) {
                String filterField = entry.getKey();
                List<String> filterValues = entry.getValue();
                
                if (!filterField.equals(excludeField) && filterValues != null && !filterValues.isEmpty()) {
                    whereIn(filterField, filterValues);
                }
            }
        }
        return this;
    }
    
    public PinotQueryBuilder orderBy(String... columns) {
        validateColumns(columns);
        orderByColumns.addAll(Arrays.asList(columns));
        return this;
    }
    
    public PinotQueryBuilder orderByTimestampDesc() {
        orderByColumns.add(TIMESTAMP_DESC);
        // Add secondary sort by toolEventId for consistent ordering within same timestamp
        orderByColumns.add("toolEventId" + SQL_DESC);
        return this;
    }

    public PinotQueryBuilder orderByTimestampAsc() {
        orderByColumns.add(TIMESTAMP_ASC);
        return this;
    }
    
    public PinotQueryBuilder orderByCountDesc() {
        orderByColumns.add(SQL_COUNT_ALIAS + SQL_DESC);
        return this;
    }
    
    public PinotQueryBuilder limit(int limit) {
        validateLimit(limit);
        this.limit = limit;
        return this;
    }
    
    public PinotQueryBuilder groupBy(String... columns) {
        validateColumns(columns);
        groupByColumns.addAll(Arrays.asList(columns));
        return this;
    }
    
    public PinotQueryBuilder groupByWithCount(String... columns) {
        validateColumns(columns);
        groupByColumns.addAll(Arrays.asList(columns));
        return this;
    }
    
    public String build() {
        validateQueryState();
        
        StringBuilder query = new StringBuilder(INITIAL_QUERY_BUFFER_SIZE);
        
        buildSelectClause(query);
        buildFromClause(query);
        buildWhereClause(query);
        buildGroupByClause(query);
        buildOrderByClause(query);
        buildLimitClause(query);
        
        return query.toString();
    }
    
    private void buildSelectClause(StringBuilder query) {
        query.append(SQL_SELECT);
        if (isDistinct) {
            query.append(SQL_DISTINCT);
        }
        query.append(String.join(", ", selectColumns));
    }
    
    private void buildFromClause(StringBuilder query) {
        query.append(SQL_FROM).append(tableName);
    }
    
    private void buildWhereClause(StringBuilder query) {
        if (!whereConditions.isEmpty()) {
            query.append(SQL_WHERE).append(String.join(SQL_AND, whereConditions));
        }
    }
    
    private void buildOrderByClause(StringBuilder query) {
        if (!orderByColumns.isEmpty()) {
            query.append(SQL_ORDER_BY).append(String.join(", ", orderByColumns));
        }
    }
    
    private void buildGroupByClause(StringBuilder query) {
        if (!groupByColumns.isEmpty()) {
            query.append(SQL_GROUP_BY).append(String.join(", ", groupByColumns));
        }
    }
    
    private void buildLimitClause(StringBuilder query) {
        if (limit != null) {
            query.append(SQL_LIMIT).append(limit);
        }
    }
    
    private String buildCondition(String field, String value, String operator) {
        if (value != null && !value.trim().isEmpty()) {
            return field + operator + SINGLE_QUOTE + escapeSqlValue(value.trim()) + SINGLE_QUOTE;
        }
        return "";
    }
    
    private String buildDateRangeCondition(String field, LocalDate startDate, LocalDate endDate) {
        if (startDate != null && endDate != null) {
            if (EVENT_TIMESTAMP_FIELD.equals(field)) {
                ZoneId userZone = ZoneId.systemDefault();
                
                long startEpoch = startDate.atTime(LocalTime.MIN)
                    .atZone(userZone).toInstant().toEpochMilli();
                
                long endEpoch = endDate.atTime(END_OF_DAY)
                    .atZone(userZone).toInstant().toEpochMilli();
                
                return field + SQL_GREATER_EQUAL + startEpoch + 
                       SQL_AND + field + SQL_LESS_EQUAL + endEpoch;
            } else {
                return field + SQL_GREATER_EQUAL + SINGLE_QUOTE + startDate.format(dateFormatter) + SINGLE_QUOTE + 
                       SQL_AND + field + SQL_LESS_EQUAL + SINGLE_QUOTE + endDate.format(dateFormatter) + SINGLE_QUOTE;
            }
        }
        return "";
    }

    public PinotQueryBuilder whereDateRange(String field, LocalDate startDate, LocalDate endDate, ZoneId userZone) {
        if (startDate != null && endDate != null) {
            String condition = buildDateRangeConditionWithTimezone(field, startDate, endDate, userZone);
            if (!condition.isEmpty()) {
                whereConditions.add(condition);
            }
        }
        return this;
    }

    private String buildDateRangeConditionWithTimezone(String field, LocalDate startDate, LocalDate endDate, ZoneId userZone) {
        if (startDate != null && endDate != null) {
            if (EVENT_TIMESTAMP_FIELD.equals(field)) {
                ZoneId targetZone = userZone != null ? userZone : ZoneId.systemDefault();
                
                long startEpoch = startDate.atTime(LocalTime.MIN)
                    .atZone(targetZone).toInstant().toEpochMilli();
                
                long endEpoch = endDate.atTime(END_OF_DAY)
                    .atZone(targetZone).toInstant().toEpochMilli();
                
                return field + SQL_GREATER_EQUAL + startEpoch + 
                       SQL_AND + field + SQL_LESS_EQUAL + endEpoch;
            } else {
            return field + SQL_GREATER_EQUAL + SINGLE_QUOTE + startDate.format(dateFormatter) + SINGLE_QUOTE + 
                   SQL_AND + field + SQL_LESS_EQUAL + SINGLE_QUOTE + endDate.format(dateFormatter) + SINGLE_QUOTE;
            }
        }
        return "";
    }
    
    private String escapeSqlValue(String value) {
        if (value == null) {
            return "";
        }
        return value.replace(SINGLE_QUOTE, DOUBLE_QUOTE).replace(BACKSLASH, DOUBLE_BACKSLASH);
    }

    private String buildTextMatchCondition(String searchTerm, String... columns) {
        validateColumns(columns);
        if (searchTerm == null || searchTerm.trim().isEmpty()) {
            return "";
        }
        String escapedSearchTerm = escapeSqlValue(searchTerm.trim());
        return Arrays.stream(columns)
            .map(column -> TEXT_MATCH_FUNCTION + "(" + column + ", " + SINGLE_QUOTE + escapedSearchTerm + SINGLE_QUOTE + ")")
            .collect(Collectors.joining(SQL_OR));
    }
    
    public PinotQueryBuilder whereRelevanceLogSearch(String searchTerm) {
        if (searchTerm != null && !searchTerm.trim().isEmpty()) {
            String processedSearchTerm = searchTerm.trim();
            
            List<String> relevanceConditions = new ArrayList<>();
            
            relevanceConditions.add(TEXT_MATCH_FUNCTION + "(summary, '" + escapeSqlValue(processedSearchTerm) + "')");
            
            relevanceConditions.add(TEXT_MATCH_FUNCTION + "(userId, '" + escapeSqlValue(processedSearchTerm) + "')");
            
            relevanceConditions.add(TEXT_MATCH_FUNCTION + "(deviceId, '" + escapeSqlValue(processedSearchTerm) + "')");
            
            String relevanceCondition = "(" + String.join(SQL_OR, relevanceConditions) + ")";
            whereConditions.add(relevanceCondition);
        }
        return this;
    }

    public PinotQueryBuilder whereCursor(String cursor) {
        if (cursor != null && !cursor.trim().isEmpty()) {
            String[] cursorParts = cursor.split(CURSOR_SEPARATOR, 2);
            if (cursorParts.length == 2) {
                try {
                    long timestamp = Long.parseLong(cursorParts[0]);
                    String toolEventId = cursorParts[1];
                    
                    String timestampLessCondition = String.format(CURSOR_TIMESTAMP_LESS_CONDITION, EVENT_TIMESTAMP_FIELD, timestamp);
                    String timestampEqualCondition = String.format(CURSOR_TIMESTAMP_EQUAL_CONDITION, 
                        EVENT_TIMESTAMP_FIELD, timestamp, SINGLE_QUOTE, escapeSqlValue(toolEventId), SINGLE_QUOTE);
                    
                    String cursorCondition = timestampLessCondition + SQL_OR + timestampEqualCondition;
                    whereConditions.add(cursorCondition);
                } catch (NumberFormatException e) {
                    throw new PinotQueryException("Invalid cursor format: timestamp must be a valid number", e);
                }
            } else {
                throw new PinotQueryException("Invalid cursor format: expected 'timestamp_toolEventId'");
            }
        }
        return this;
    }
    
    private void validateTableName(String tableName) {
        if (tableName == null || tableName.trim().isEmpty()) {
            throw new PinotQueryException("Table name must not be null or empty");
        }
    }
    
    private void validateFieldName(String field) {
        if (field == null || field.trim().isEmpty()) {
            throw new PinotQueryException("Field name must not be null or empty");
        }
    }
    
    private void validateColumns(String[] columns) {
        if (columns == null || columns.length == 0) {
            throw new PinotQueryException("Columns array must not be null or empty");
        }
        for (int i = 0; i < columns.length; i++) {
            String column = columns[i];
            if (column == null || column.trim().isEmpty()) {
                throw new PinotQueryException("Column name at index " + i + " must not be null or empty");
            }
        }
    }
    
    private void validateLimit(int limit) {
        if (limit < MIN_LIMIT || limit > MAX_LIMIT) {
            throw new PinotQueryException("Limit must be between " + MIN_LIMIT + " and " + MAX_LIMIT + ", got: " + limit);
        }
    }
    
    private void validateQueryState() {
        if (selectColumns.isEmpty()) {
            throw new PinotQueryException("No columns selected. Use select() method first.");
        }
    }
} 