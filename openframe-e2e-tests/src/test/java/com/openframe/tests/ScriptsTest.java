package com.openframe.tests;

import com.openframe.data.dto.script.Script;
import com.openframe.tests.base.AuthorizedTest;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.List;

import static com.openframe.api.ScriptApi.*;
import static com.openframe.data.generator.ScriptGenerator.*;
import static org.assertj.core.api.Assertions.assertThat;

@Disabled("Tests disabled - waiting for fix")
@Tag("authorized")
@DisplayName("Scripts")
public class ScriptsTest extends AuthorizedTest {

    @Test
    @DisplayName("List scripts")
    public void testListScripts() {
        List<Script> scripts = listScripts();
        assertThat(scripts).as("Expected at least one script").isNotEmpty();
        assertThat(scripts).allSatisfy(script -> {
            assertThat(script.getId()).isNotNull();
            assertThat(script.getName()).isNotEmpty();
            assertThat(script.getDescription()).isNotEmpty();
        });
    }

    @Test
    @DisplayName("Get script")
    public void testGetScript() {
        List<Script> scripts = listScripts();
        assertThat(scripts).as("Expected at least one script to exist").isNotEmpty();
        Script script = scripts.getFirst();
        Script existingScript = getScript(script.getId());
        assertThat(existingScript).isNotNull();
        assertThat(existingScript.getScriptBody()).isNotEmpty();
        assertThat(existingScript).usingRecursiveComparison()
                .ignoringFields("scriptType", "scriptBody").isEqualTo(script);
    }

    @Test
    @DisplayName("Add script")
    public void testAddScript() {
        Script script = addScriptRequest();
        String response = addScript(script);
        assertThat(response).isEqualTo(addScriptResponse(script));
    }

    @Test
    @DisplayName("Edit script")
    public void testEditScript() {
        List<Script> scripts = listScripts();
        assertThat(scripts).as("Expected at least one script to exist").isNotEmpty();
        Script script = scripts.getFirst();
        script.setDescription("Updated description");
        String response = editScript(script);
        assertThat(response).isEqualTo(editScriptResponse(script));
        Script updatedScript = getScript(script.getId());
        assertThat(updatedScript).isEqualTo(script);
    }
}
