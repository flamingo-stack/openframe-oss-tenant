package ai.openframe.analysis.graphql;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class Field {
    protected final String name;
    protected final Map<String, Object> args;
    protected final List<Field> subfields;
    private Field parent;
    
    public Field(String name) {
        this.name = name;
        this.args = new LinkedHashMap<>();
        this.subfields = new ArrayList<>();
    }
    
    public Field addArg(String key, Object value) {
        args.put(key, value);
        return this;
    }
    
    public Field addField(String name) {
        Field field = new Field(name);
        field.parent = this;
        subfields.add(field);
        return field;
    }
    
    public Field addField(Field field) {
        field.parent = this;
        subfields.add(field);
        return field;
    }

    // Return to parent for sibling fields
    public Field add(String name) {
        addField(name);
        return this.parent != null ? this.parent : this;
    }
    
    // Return current field for nesting
    public Field nest(String name) {
        return addField(name);
    }
}