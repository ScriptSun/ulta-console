export interface FieldPreset {
  id: string;
  label: string;
  label_default: string;
  key_default: string;
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
  default_value: any;
  masked?: boolean;
  secret?: boolean;
  runtime_editable: boolean;
  server_validation_hint?: string;
}

export const FIELD_PRESETS: Record<string, FieldPreset> = {
  domain: {
    id: 'domain',
    label: 'Domain',
    label_default: 'Domain',
    key_default: 'domain',
    type: 'string',
    pattern: '^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$',
    description: 'Domain name (e.g., example.com)',
    default: '',
    default_value: '',
    runtime_editable: true,
    server_validation_hint: 'FQDN validation'
  },
  email: {
    id: 'email',
    label: 'Email',
    label_default: 'Admin Email',
    key_default: 'admin_email',
    type: 'string',
    format: 'email',
    description: 'Email address',
    default: '',
    default_value: '',
    runtime_editable: true,
    server_validation_hint: 'Email format validation'
  },
  db_username: {
    id: 'db_username',
    label: 'Database Username',
    label_default: 'Database Username',
    key_default: 'db_user',
    type: 'string',
    pattern: '^[a-zA-Z0-9_]{3,32}$',
    description: 'Database username (3-32 chars, alphanumeric + underscore)',
    default: '',
    default_value: '',
    runtime_editable: true,
    server_validation_hint: 'Alphanumeric with underscore validation'
  },
  db_name: {
    id: 'db_name',
    label: 'Database Name',
    label_default: 'Database Name',
    key_default: 'db_name',
    type: 'string',
    pattern: '^[a-zA-Z0-9_]{3,32}$',
    description: 'Database name (3-32 chars, alphanumeric + underscore)',
    default: '',
    default_value: '',
    runtime_editable: true,
    server_validation_hint: 'Alphanumeric with underscore validation'
  },
  password: {
    id: 'password',
    label: 'Password',
    label_default: 'Password',
    key_default: 'password',
    type: 'string',
    minLength: 8,
    maxLength: 64,
    description: 'Password (8-64 characters)',
    default: '',
    default_value: '',
    masked: true,
    runtime_editable: true,
    server_validation_hint: 'Password strength validation'
  },
  path: {
    id: 'path',
    label: 'File Path',
    label_default: 'File Path',
    key_default: 'file_path',
    type: 'string',
    pattern: '^/([a-zA-Z0-9/_\\.-]+)$',
    description: 'Unix file path',
    default: '/',
    default_value: '/',
    runtime_editable: false,
    server_validation_hint: 'Unix path validation'
  },
  port: {
    id: 'port',
    label: 'Port',
    label_default: 'Port',
    key_default: 'port',
    type: 'integer',
    minimum: 1,
    maximum: 65535,
    description: 'Network port (1-65535)',
    default: 80,
    default_value: 80,
    runtime_editable: true,
    server_validation_hint: 'Port range validation'
  },
  integer: {
    id: 'integer',
    label: 'Integer',
    label_default: 'Integer',
    key_default: 'value',
    type: 'integer',
    description: 'Whole number',
    default: 0,
    default_value: 0,
    runtime_editable: true,
    server_validation_hint: 'Integer validation'
  },
  boolean: {
    id: 'boolean',
    label: 'Boolean',
    label_default: 'Enabled',
    key_default: 'enabled',
    type: 'boolean',
    description: 'True/false value',
    default: false,
    default_value: false,
    runtime_editable: true,
    server_validation_hint: 'Boolean validation'
  },
  select: {
    id: 'select',
    label: 'Select',
    label_default: 'Option',
    key_default: 'option',
    type: 'string',
    enum: ['option1', 'option2', 'option3'],
    description: 'Select from predefined options',
    default: 'option1',
    default_value: 'option1',
    runtime_editable: true,
    server_validation_hint: 'Enum validation'
  },
  text: {
    id: 'text',
    label: 'Text',
    label_default: 'Text',
    key_default: 'text',
    type: 'string',
    description: 'Short text input',
    default: '',
    default_value: '',
    runtime_editable: true,
    server_validation_hint: 'Text validation'
  },
  textarea: {
    id: 'textarea',
    label: 'Long Text',
    label_default: 'Description',
    key_default: 'description',
    type: 'string',
    description: 'Multi-line text input',
    default: '',
    default_value: '',
    runtime_editable: true,
    server_validation_hint: 'Text validation'
  },
  secret: {
    id: 'secret',
    label: 'Secret',
    label_default: 'Secret',
    key_default: 'secret',
    type: 'string',
    description: 'Secret value from vault',
    default: '',
    default_value: '',
    secret: true,
    masked: true,
    runtime_editable: true,
    server_validation_hint: 'Secret validation'
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
    key: 'file_path',
    label: 'Install Path',
    preset: 'path',
    required: true,
    defaultValue: '/var/www/html',
    helpText: 'WordPress installation directory'
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