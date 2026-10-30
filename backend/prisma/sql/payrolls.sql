CREATE TABLE IF NOT EXISTS public.payrolls (
  payroll_id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES public.employees(employee_id) ON DELETE CASCADE ON UPDATE CASCADE,
  month VARCHAR(7) NOT NULL,
  base_salary DECIMAL(12, 2) NOT NULL,
  standard_days INTEGER NOT NULL DEFAULT 22,
  off_days INTEGER NOT NULL DEFAULT 0,
  deduction DECIMAL(12, 2) NOT NULL DEFAULT 0,
  extra DECIMAL(12, 2) NOT NULL DEFAULT 0,
  net_salary DECIMAL(12, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT payrolls_employee_id_month_key UNIQUE (employee_id, month)
);
