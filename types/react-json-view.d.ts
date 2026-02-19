declare module 'react-json-view' {
  import * as React from 'react';

  export type Interaction = {
    updated_src: Record<string, unknown>;
  };

  export interface ReactJsonViewProps {
    src: Record<string, unknown>;
    name?: string | false;
    onEdit?: (interaction: Interaction) => void;
    onAdd?: (interaction: Interaction) => void;
    onDelete?: (interaction: Interaction) => void;
    displayDataTypes?: boolean;
    displayObjectSize?: boolean;
    enableClipboard?: boolean;
    collapsed?: boolean | number;
    style?: React.CSSProperties;
  }

  const ReactJson: React.ComponentType<ReactJsonViewProps>;
  export default ReactJson;
}
