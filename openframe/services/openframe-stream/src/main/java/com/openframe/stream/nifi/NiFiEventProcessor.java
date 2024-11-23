package com.openframe.stream.nifi;

import org.apache.nifi.annotation.behavior.ReadsAttribute;
import org.apache.nifi.annotation.behavior.WritesAttribute;
import org.apache.nifi.annotation.documentation.CapabilityDescription;
import org.apache.nifi.annotation.documentation.Tags;
import org.apache.nifi.components.PropertyDescriptor;
import org.apache.nifi.processor.AbstractProcessor;
import org.apache.nifi.processor.ProcessContext;
import org.apache.nifi.processor.ProcessSession;
import org.apache.nifi.processor.ProcessorInitializationContext;
import org.apache.nifi.processor.Relationship;

@Tags({"openframe", "event", "processing"})
@CapabilityDescription("Processes OpenFrame events through NiFi")
public class NiFiEventProcessor extends AbstractProcessor {

    private List<PropertyDescriptor> properties;
    private Set<Relationship> relationships;

    @Override
    protected void init(ProcessorInitializationContext context) {
        final List<PropertyDescriptor> props = new ArrayList<>();
        properties = Collections.unmodifiableList(props);

        final Set<Relationship> rels = new HashSet<>();
        rels.add(new Relationship.Builder()
                .name("success")
                .description("Successful event processing")
                .build());
        rels.add(new Relationship.Builder()
                .name("failure")
                .description("Failed event processing")
                .build());
        relationships = Collections.unmodifiableSet(rels);
    }

    @Override
    public void onTrigger(ProcessContext context, ProcessSession session) {
        FlowFile flowFile = session.get();
        if (flowFile == null) {
            return;
        }

        try {
            // Process the flow file
            session.transfer(flowFile, REL_SUCCESS);
        } catch (Exception e) {
            session.transfer(flowFile, REL_FAILURE);
        }
    }
}
