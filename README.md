# Integration.app Workspace Import/Export Tool

This CLI tool allows you to export and import data from Integration.app Workspaces, facilitating easier management and migration of workspace configurations.

## Features

- Export workspace data including custom connectors, integrations, actions, and more
- Import workspace data to set up or update workspaces quickly
- Support for both universal and integration-specific elements
- Command-line interface for easy integration into scripts and workflows

## Prerequisites

- Node.js (v18 or higher recommended)
- npm
- Access to Integration.app workspaces (export and import keys/secrets)

## Installation

1. Install dependencies:

   ```
   npm install
   ```

2. Configure environment variables:
   Copy `.env-sample` file to `.env` and populate it with correct values. in the root directory with the following content:

## Usage

### Command-Line Interface

```
npm run export
npm run exportOnprem // This will download all connectors, even one that exists in our Store
npm run import
```

### Exporting Workspace Data

To export data from a workspace:

```
npm run export
```

This command will export all exportable elements from the workspace specified by the `EXPORT_WORKSPACE_KEY` and `EXPORT_WORKSPACE_SECRET`. The exported data will be saved in the `dist` directory.

To include all connectors (including store connectors) in the export:

```
npm run exportOnprem
```

During the export process:

- Custom connectors are downloaded and saved as ZIP files.
- Integration data, including connector versions, is captured.
- Universal and integration-specific elements are exported.

### Importing Workspace Data

To import data into a workspace:

```
npm run import
```

This command will import the data from the `dist` directory into the workspace specified by the `IMPORT_WORKSPACE_KEY`, `IMPORT_WORKSPACE_SECRET`, and `IMPORT_WORKSPACE_ID`.

During the import process:

- Connectors are matched or created in the destination workspace.
- Integrations are created or updated, including switching to the correct connector version if necessary.
- Universal and integration-specific elements are synced, with proper handling of customizations and resets.

## Structure of Exported Data

The exported data is organized in the `dist` directory as follows:

```
dist/
├── connectors/
│   └── [ConnectorName]_[ConnectorID]/
│       └── [Version]/
│           ├── [Version].yaml
│           └── [Version].zip
├── [ElementType]/
│   └── [ElementKey]/
│       └── [ElementKey].yaml
└── ...
```

All exported data is stored in YAML format for better readability and version control.

## Supported Element Types

- Integrations (export only)
- Connectors
- Actions
- App Data Schemas
- App Event Types
- Data Link Tables
- Data Sources
- Field Mappings
- Flows

Each element type has specific handling in the code, including cleanup for export and proper syncing during import.

## Notes

- The tool automatically handles the creation, updating, and resetting of elements based on their existence and customization status in the target workspace.
- Warnings and errors are displayed during the import process to help identify any issues.
- Custom connectors are currently supported for export and import. Store connector support may be limited.
- The tool uses color-coded console output to improve readability of the process logs.
- Data Sources are synced first during the import process to ensure proper dependencies.

## Troubleshooting

If you encounter any issues:

1. Ensure your `.env` file is correctly configured with valid keys and secrets.
2. Check that you have the necessary permissions for the workspaces you're exporting from and importing to.
3. For import errors related to missing integrations, ensure that the required applications are available in your destination workspace.
4. If you encounter "Integration mismatch errors", it means some integrations couldn't be created in the destination workspace. This usually happens when custom connectors are not available.
5. Check the console output for color-coded messages:
   - Green: Successful operations
   - Blue: Informational messages
   - Yellow: Warnings
   - Red: Errors

## Contributing

Contributions to improve the tool are welcome. Please submit issues and pull requests on the project's GitHub repository.

When contributing, please note:

- The code uses the `@integration-app/sdk` for interacting with the Integration.app API.
- Utility functions are available in `src/util.js` for common operations like generating access tokens and color-coded logging.
- Element type definitions and cleanup functions are defined in `src/integrationElements.js`.

## License

# TODO: Add license.

## Future Improvements

# TODO: Add future improvements.
