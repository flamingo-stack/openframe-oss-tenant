# OpenFrame Diagrams

This directory contains architectural and deployment diagrams for OpenFrame. The diagrams are created using Mermaid and PlantUML, and are stored in both source and rendered formats.

## Available Diagrams

### Architecture Diagrams

1. [System Overview](system-overview.md)
   - High-level system architecture
   - Component relationships
   - Data flow

2. [Kubernetes Architecture](kubernetes-architecture.md)
   - Pod layout
   - Service mesh configuration
   - Network topology

3. [Data Flow](data-flow.md)
   - Request/response flow
   - Data storage patterns
   - Cache usage

### Deployment Diagrams

1. [Infrastructure Layout](infrastructure-layout.md)
   - Node distribution
   - Storage configuration
   - Network setup

2. [Service Deployment](service-deployment.md)
   - Service placement
   - Replica distribution
   - Resource allocation

3. [Security Architecture](security-architecture.md)
   - Network policies
   - RBAC configuration
   - Secret management

## Diagram Sources

All diagrams are stored in the following formats:
- `.puml` - PlantUML source files
- `.mmd` - Mermaid source files
- `.png` - Rendered images
- `.svg` - Vector graphics

## How to Use

1. View rendered diagrams:
   - Open the `.md` files to see the rendered diagrams
   - View `.png` or `.svg` files directly

2. Edit diagrams:
   - Modify `.puml` files for PlantUML diagrams
   - Modify `.mmd` files for Mermaid diagrams
   - Re-render using the appropriate tools

3. Add new diagrams:
   - Create source files in the appropriate format
   - Add references in the relevant documentation
   - Update this README

## Tools Required

- PlantUML for `.puml` files
- Mermaid CLI for `.mmd` files
- ImageMagick for image processing (optional)

## Contributing

When adding new diagrams:
1. Create both source and rendered versions
2. Update the relevant documentation
3. Add references in this README
4. Ensure diagrams follow the style guide 