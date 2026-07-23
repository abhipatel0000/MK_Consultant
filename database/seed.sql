-- Seed Services for M K Consultant
USE `mk_consultant`;

INSERT INTO `services` (`service_key`, `service_name`, `display_order`, `is_active`) VALUES
('gst_registration', 'GST Registration', 1, 1),
('msme_registration', 'MSME Registration', 2, 1),
('iec_registration', 'IEC Registration', 3, 1),
('icegate_registration', 'ICEGATE Registration', 4, 1),
('fssai_registration', 'FSSAI Registration', 5, 1),
('pan_card', 'PAN Card', 6, 1),
('passport_registration', 'Passport Registration', 7, 1),
('trademark_registration', 'Trademark Registration', 8, 1),
('digital_signature', 'Digital Signature (DSC)', 9, 1),
('partnership_deed', 'Partnership Deed', 10, 1),
('accounting_work', 'Accounting Work & Compliance', 11, 1),
('other_services', 'Other Services / General Enquiry', 12, 1)
ON DUPLICATE KEY UPDATE `service_name` = VALUES(`service_name`), `display_order` = VALUES(`display_order`);
