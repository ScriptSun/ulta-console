export interface FieldPreset {
  id: string;
  label: string;
  type: 'string' | 'integer' | 'boolean' | 'array';
  format?: string;
  pattern?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  enum?: string[];
  description?: string;
  default?: any;
  masked?: boolean;
  secret?: boolean;
}

export const FIELD_PRESETS: Record<string, FieldPreset> = {
  domain: {
    id: 'domain',
    label: 'Domain',
    type: 'string',
    pattern: '^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$',
    description: 'Domain name (e.g., example.com)',
    default: ''
  },
  email: {
    id: 'email',
    label: 'Email',
    type: 'string',
    format: 'email',
    description: 'Email address',
    default: ''
  },
  db_username: {
    id: 'db_username',
    label: 'Database Username',
    type: 'string',
    pattern: '^[a-zA-Z0-9_]{3,32}$',
    description: 'Database username (3-32 chars, alphanumeric + underscore)',
    default: ''
  },
  db_name: {
    id: 'db_name',
    label: 'Database Name',
    type: 'string',
    pattern: '^[a-zA-Z0-9_]{3,32}$',
    description: 'Database name (3-32 chars, alphanumeric + underscore)',
    default: ''
  },
  password: {
    id: 'password',
    label: 'Password',
    type: 'string',
    minLength: 8,
    maxLength: 64,
    description: 'Password (8-64 characters)',
    default: '',
    masked: true
  },
  path: {
    id: 'path',
    label: 'File Path',
    type: 'string',
    pattern: '^/([a-zA-Z0-9/_\\.-]+)$',
    description: 'Unix file path',
    default: '/'
  },
  port: {
    id: 'port',
    label: 'Port',
    type: 'integer',
    minimum: 1,
    maximum: 65535,
    description: 'Network port (1-65535)',
    default: 80
  },
  integer: {
    id: 'integer',
    label: 'Integer',
    type: 'integer',
    description: 'Whole number',
    default: 0
  },
  boolean: {
    id: 'boolean',
    label: 'Boolean',
    type: 'boolean',
    description: 'True/false value',
    default: false
  },
  select: {
    id: 'select',
    label: 'Select',
    type: 'string',
    enum: ['option1', 'option2', 'option3'],
    description: 'Select from predefined options',
    default: 'option1'
  },
  text: {
    id: 'text',
    label: 'Text',
    type: 'string',
    description: 'Short text input',
    default: ''
  },
  textarea: {
    id: 'textarea',
    label: 'Long Text',
    type: 'string',
    description: 'Multi-line text input',
    default: ''
  },
  secret: {
    id: 'secret',
    label: 'Secret',
    type: 'string',
    description: 'Secret value from vault',
    default: '',
    secret: true,
    masked: true
  }
};

export const EXAMPLE_WORDPRESS_FIELDS = [
  {
    key: 'domain',
    label: 'Domain',
    preset: 'domain',
    required: true,
    defaultValue: 'example.com',
    helpText: 'The domain where WordPress will be installed'
  },
  {
    key: 'admin_email',
    label: 'Admin Email',
    preset: 'email',
    required: true,
    defaultValue: 'admin@example.com',
    helpText: 'Administrator email address'
  },
  {
    key: 'db_name',
    label: 'Database Name',
    preset: 'db_name',
    required: true,
    defaultValue: 'wordpress',
    helpText: 'WordPress database name'
  },
  {
    key: 'db_user',
    label: 'Database User',
    preset: 'db_username',
    required: true,
    defaultValue: 'wp_user',
    helpText: 'Database user for WordPress'
  },
  {
    key: 'db_pass',
    label: 'Database Password',
    preset: 'password',
    required: true,
    defaultValue: '',
    helpText: 'Strong password for database user'
  },
  {
    key: 'php_version',
    label: 'PHP Version',
    preset: 'select',
    required: false,
    defaultValue: '8.1',
    helpText: 'PHP version to install',
    options: ['7.4', '8.0', '8.1', '8.2', '8.3']
  }
];