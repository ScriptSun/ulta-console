-- Create OS targets table for managing operating systems and versions
CREATE TABLE public.os_targets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  icon_name TEXT NOT NULL DEFAULT 'Monitor',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL DEFAULT auth.uid(),
  updated_by UUID NOT NULL DEFAULT auth.uid(),
  UNIQUE(name, version)
);

-- Enable RLS
ALTER TABLE public.os_targets ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view OS targets" 
ON public.os_targets 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage OS targets" 
ON public.os_targets 
FOR ALL 
USING (is_admin())
WITH CHECK (is_admin());

-- Create trigger for updated_at
CREATE TRIGGER update_os_targets_updated_at
BEFORE UPDATE ON public.os_targets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default OS targets
INSERT INTO public.os_targets (name, version, display_name, description, icon_name, sort_order) VALUES
('ubuntu', '22.04', 'Ubuntu 22.04 LTS', 'Ubuntu 22.04 Long Term Support', 'Monitor', 1),
('ubuntu', '20.04', 'Ubuntu 20.04 LTS', 'Ubuntu 20.04 Long Term Support', 'Monitor', 2),
('debian', '12', 'Debian 12', 'Debian 12 (Bookworm)', 'Monitor', 3),
('debian', '11', 'Debian 11', 'Debian 11 (Bullseye)', 'Monitor', 4),
('almalinux', '9', 'AlmaLinux 9', 'AlmaLinux 9 Enterprise Linux', 'Server', 5),
('almalinux', '8', 'AlmaLinux 8', 'AlmaLinux 8 Enterprise Linux', 'Server', 6),
('centos', '7', 'CentOS 7', 'CentOS 7 Enterprise Linux', 'Cpu', 7),
('rhel', '9', 'RHEL 9', 'Red Hat Enterprise Linux 9', 'Server', 8),
('rhel', '8', 'RHEL 8', 'Red Hat Enterprise Linux 8', 'Server', 9),
('windows', 'server-2022', 'Windows Server 2022', 'Microsoft Windows Server 2022', 'HardDrive', 10),
('windows', 'server-2019', 'Windows Server 2019', 'Microsoft Windows Server 2019', 'HardDrive', 11);