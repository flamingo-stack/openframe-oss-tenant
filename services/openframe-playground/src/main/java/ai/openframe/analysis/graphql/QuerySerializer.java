package ai.openframe.analysis.graphql;

import java.util.List;
import java.util.Map;
import java.util.StringJoiner;

public class QuerySerializer {
    private int indent = 0;
    
    public String serialize(List<Field> fields) {
        StringBuilder json = new StringBuilder();
        serializeFields(json, fields);
        return json.toString();
    }
    
    private void serializeFields(StringBuilder builder, List<Field> fields) {
        builder.append("query {\n");
        indent += 2;
        
        for (Field field : fields) {
            serializeField(builder, field);
        }
        
        indent -= 2;
        appendIndent(builder).append("}");
    }
    
    private void serializeField(StringBuilder builder, Field field) {
        appendIndent(builder).append(field.name);
        
        if (!field.args.isEmpty()) {
            serializeArguments(builder, field.args);
        }
        
        if (!field.subfields.isEmpty() || field.name.startsWith("... on ")) {
            builder.append(" {\n");
            indent += 2;
            
            for (Field subfield : field.subfields) {
                serializeField(builder, subfield);
            }
            
            indent -= 2;
            appendIndent(builder).append("}\n");
        } else {
            builder.append("\n");
        }
    }
    
    private void serializeArguments(StringBuilder builder, Map<String, Object> args) {
        builder.append("(");
        StringJoiner joiner = new StringJoiner(", ");
        
        for (Map.Entry<String, Object> entry : args.entrySet()) {
            String value = entry.getValue() instanceof String 
                ? entry.getValue().toString()  // Don't add extra quotes
                : entry.getValue().toString();
            joiner.add(entry.getKey() + ": " + value);
        }
        
        builder.append(joiner.toString()).append(")");
    }
    
    private StringBuilder appendIndent(StringBuilder builder) {
        return builder.append(" ".repeat(indent));
    }
}