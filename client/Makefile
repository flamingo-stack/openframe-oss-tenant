# Define the name of your tar archive
ARCHIVE_NAME = client.tar.gz

# Define the directory/files to be included in the archive
SOURCE_DIR = test.sh

# Target to create the tar archive
$(ARCHIVE_NAME): $(SOURCE_DIR)
	tar -czvf $(ARCHIVE_NAME) $(SOURCE_DIR)

# Phony target for cleaning up the archive
.PHONY: clean
clean:
	rm -f $(ARCHIVE_NAME)