#!/bin/bash

#==========================================================================
#  This script performs SQL schema changes on the test databases that are
#  saved as SQL files in the test directory. It loads them, performs the
#  ALTER commands, then saves the sql file.
#
#  If the test file uses its own database saved as a .sql file, make sure
#  it is listed in the dbs array
#==========================================================================

usage() {
	cat <<EOF

SYNOPSIS
	$0 [-f]

	Perform SQL schema changes on test databases or the supplied database.
	With no options, this script applies db changes embeded below to all
	SQL database files in dbfiles.txt.

    Use the -f option to operate on a specific file.

OPTIONS
	-f  filename
        Perform schema changes on filename, then exit.
EOF
}

#=====================================================
#  History of db mods
#=====================================================
# # Sep 25, 2017
# ALTER TABLE RentalAgreement ADD COLUMN FLAGS BIGINT NOT NULL DEFAULT 0 AFTER RightOfFirstRefusal;
# # Sep 26, 2017
# ALTER TABLE AR ADD COLUMN FLAGS BIGINT NOT NULL DEFAULT 0 AFTER DtStop;
# ALTER TABLE AR ADD COLUMN DefaultAmount DECIMAL(19,4) NOT NULL DEFAULT 0.0 AFTER FLAGS;
# # Sep 27, 2017
# ALTER TABLE Receipt ADD COLUMN RAID BIGINT NOT NULL DEFAULT 0 AFTER DID;
# # Oct 9, 2017
# ALTER TABLE Rentable ADD COLUMN MRStatus SMALLINT NOT NULL DEFAULT 0 AFTER AssignmentTime;
# ALTER TABLE Rentable ADD DtMRStart TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER MRStatus;
# ALTER TABLE RentableStatus CHANGE Status UseStatus SMALLINT NOT NULL DEFAULT 0;
# ALTER TABLE RentableStatus ADD COLUMN LeaseStatus SMALLINT NOT NULL DEFAULT 0 AFTER UseStatus;
# DROP TABLE IF EXISTS SubAR;
# CREATE TABLE SubAR (
#     SARID BIGINT NOT NULL AUTO_INCREMENT,
#     ARID BIGINT NOT NULL DEFAULT 0,                         -- Which ARID
#     SubARID BIGINT NOT NULL DEFAULT 0,                      -- ARID of the sub-account rule
#     BID BIGINT NOT NULL DEFAULT 0,
#     LastModTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,  -- when was this record last written
#     LastModBy BIGINT NOT NULL DEFAULT 0,                    -- employee UID (from phonebook) that modified it
#     CreateTS TIMESTAMP DEFAULT CURRENT_TIMESTAMP,           -- when was this record created
#     CreateBy BIGINT NOT NULL DEFAULT 0,                     -- employee UID (from phonebook) that created this record
#     PRIMARY KEY(SARID)
# );
# ALTER TABLE Assessments ADD COLUMN AGRCPTID BIGINT NOT NULL DEFAULT 0 AFTER RPASMID;

# # 13 Dec, 2017
# ALTER TABLE CustomAttrRef ADD LastModTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER CreateBy;
# ALTER TABLE CustomAttrRef ADD LastModBy BIGINT NOT NULL DEFAULT 0 AFTER LastModTime;
# ALTER TABLE RentalAgreementRentables ADD LastModTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER CreateBy;
# ALTER TABLE RentalAgreementRentables ADD LastModBy BIGINT NOT NULL DEFAULT 0 AFTER LastModTime;
# ALTER TABLE RentalAgreementPayors ADD LastModTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER CreateBy;
# ALTER TABLE RentalAgreementPayors ADD LastModBy BIGINT NOT NULL DEFAULT 0 AFTER LastModTime;
# ALTER TABLE RentableUsers ADD LastModTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER CreateBy;
# ALTER TABLE RentableUsers ADD LastModBy BIGINT NOT NULL DEFAULT 0 AFTER LastModTime;
# ALTER TABLE RentalAgreementTax ADD LastModTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER CreateBy;
# ALTER TABLE RentalAgreementTax ADD LastModBy BIGINT NOT NULL DEFAULT 0 AFTER LastModTime;
# ALTER TABLE CommissionLedger ADD LastModTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER CreateBy;
# ALTER TABLE CommissionLedger ADD LastModBy BIGINT NOT NULL DEFAULT 0 AFTER LastModTime;
# ALTER TABLE RatePlanRefRTRate ADD LastModTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER CreateBy;
# ALTER TABLE RatePlanRefRTRate ADD LastModBy BIGINT NOT NULL DEFAULT 0 AFTER LastModTime;
# ALTER TABLE RatePlanRefSPRate ADD LastModTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER CreateBy;
# ALTER TABLE RatePlanRefSPRate ADD LastModBy BIGINT NOT NULL DEFAULT 0 AFTER LastModTime;
# ALTER TABLE RatePlanOD ADD LastModTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER CreateBy;
# ALTER TABLE RatePlanOD ADD LastModBy BIGINT NOT NULL DEFAULT 0 AFTER LastModTime;
# ALTER TABLE OtherDeliverables ADD LastModTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER CreateBy;
# ALTER TABLE OtherDeliverables ADD LastModBy BIGINT NOT NULL DEFAULT 0 AFTER LastModTime;
# ALTER TABLE RentableMarketRate ADD LastModTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER CreateBy;
# ALTER TABLE RentableMarketRate ADD LastModBy BIGINT NOT NULL DEFAULT 0 AFTER LastModTime;
# ALTER TABLE RentableTypeTax ADD LastModTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER CreateBy;
# ALTER TABLE RentableTypeTax ADD LastModBy BIGINT NOT NULL DEFAULT 0 AFTER LastModTime;
# ALTER TABLE RentableSpecialty ADD LastModTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER CreateBy;
# ALTER TABLE RentableSpecialty ADD LastModBy BIGINT NOT NULL DEFAULT 0 AFTER LastModTime;
# ALTER TABLE AvailabilityTypes ADD LastModTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER CreateBy;
# ALTER TABLE AvailabilityTypes ADD LastModBy BIGINT NOT NULL DEFAULT 0 AFTER LastModTime;
# ALTER TABLE BusinessAssessments ADD LastModTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER CreateBy;
# ALTER TABLE BusinessAssessments ADD LastModBy BIGINT NOT NULL DEFAULT 0 AFTER LastModTime;
# ALTER TABLE BusinessPaymentTypes ADD LastModTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER CreateBy;
# ALTER TABLE BusinessPaymentTypes ADD LastModBy BIGINT NOT NULL DEFAULT 0 AFTER LastModTime;
# ALTER TABLE InvoiceAssessment ADD LastModTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER CreateBy;
# ALTER TABLE InvoiceAssessment ADD LastModBy BIGINT NOT NULL DEFAULT 0 AFTER LastModTime;
# ALTER TABLE InvoicePayor ADD LastModTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER CreateBy;
# ALTER TABLE InvoicePayor ADD LastModBy BIGINT NOT NULL DEFAULT 0 AFTER LastModTime;
# ALTER TABLE JournalAllocation ADD LastModTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER CreateBy;
# ALTER TABLE JournalAllocation ADD LastModBy BIGINT NOT NULL DEFAULT 0 AFTER LastModTime;
# ALTER TABLE JournalAudit DROP COLUMN ModTime;
# ALTER TABLE JournalAudit ADD CreateTS TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER UID;
# ALTER TABLE JournalAudit ADD CreateBy BIGINT NOT NULL DEFAULT 0 AFTER CreateTS;
# ALTER TABLE JournalAudit ADD LastModTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER CreateBy;
# ALTER TABLE JournalAudit ADD LastModBy BIGINT NOT NULL DEFAULT 0 AFTER LastModTime;
# ALTER TABLE JournalMarkerAudit DROP COLUMN ModTime;
# ALTER TABLE JournalMarkerAudit ADD CreateTS TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER UID;
# ALTER TABLE JournalMarkerAudit ADD CreateBy BIGINT NOT NULL DEFAULT 0 AFTER CreateTS;
# ALTER TABLE JournalMarkerAudit ADD LastModTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER CreateBy;
# ALTER TABLE JournalMarkerAudit ADD LastModBy BIGINT NOT NULL DEFAULT 0 AFTER LastModTime;
# ALTER TABLE LedgerAudit DROP COLUMN ModTime;
# ALTER TABLE LedgerAudit ADD CreateTS TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER UID;
# ALTER TABLE LedgerAudit ADD CreateBy BIGINT NOT NULL DEFAULT 0 AFTER CreateTS;
# ALTER TABLE LedgerAudit ADD LastModTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER CreateBy;
# ALTER TABLE LedgerAudit ADD LastModBy BIGINT NOT NULL DEFAULT 0 AFTER LastModTime;
# ALTER TABLE LedgerMarkerAudit DROP COLUMN ModTime;
# ALTER TABLE LedgerMarkerAudit ADD CreateTS TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER UID;
# ALTER TABLE LedgerMarkerAudit ADD CreateBy BIGINT NOT NULL DEFAULT 0 AFTER CreateTS;
# ALTER TABLE LedgerMarkerAudit ADD LastModTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER CreateBy;
# ALTER TABLE LedgerMarkerAudit ADD LastModBy BIGINT NOT NULL DEFAULT 0 AFTER LastModTime;


# # 1 Jan, 2018
# ALTER TABLE rentroll.CustomAttrRef ADD CARID BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY;
# ALTER TABLE rentroll.RatePlanRefRTRate ADD RPRRTRateID BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY;
# ALTER TABLE rentroll.RatePlanRefSPRate ADD RPRSPRateID BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY;
# ALTER TABLE rentroll.RentableSpecialtyRef ADD RSPRefID BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY;
# ALTER TABLE rentroll.Prospect MODIFY TCID BIGINT NOT NULL;
# ALTER TABLE rentroll.User MODIFY TCID BIGINT NOT NULL;
# ALTER TABLE rentroll.Payor MODIFY TCID BIGINT NOT NULL;
# ALTER TABLE rentroll.InvoiceAssessment ADD InvoiceASMID BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY;
# ALTER TABLE rentroll.InvoicePayor ADD InvoicePayorID BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY;

# # 15 Feb, 2018
# ALTER TABLE rentroll.Business ADD FLAGS BIGINT NOT NULL DEFAULT 0 AFTER DefaultGSRPC;


# 11-MAR-2018
# CREATE TABLE Task (
#     TID BIGINT NOT NULL AUTO_INCREMENT,
#     BID BIGINT NOT NULL DEFAULT 0,
#     TLID BIGINT NOT NULL DEFAULT 0,                             -- the TaskList to which this task belongs
#     Name VARCHAR(256) NOT NULL DEFAULT '',                      -- Task text
#     Worker VARCHAR(80) NOT NULL DEFAULT '',                     -- Name of the associated work function
#     DtDue TIMESTAMP NOT NULL DEFAULT '1970-01-01 00:00:00',     -- Task Due Date
#     DtPreDue TIMESTAMP NOT NULL DEFAULT '1970-01-01 00:00:00',  -- Pre Completion due date
#     DtDone TIMESTAMP NOT NULL DEFAULT '1970-01-01 00:00:00',    -- Task completion Date
#     DtPreDone TIMESTAMP NOT NULL DEFAULT '1970-01-01 00:00:00', -- Task Pre Completion Date
#     FLAGS BIGINT NOT NULL DEFAULT 0,                            -- 1<<0 pre-completion required (if 0 then there is no pre-completion required)
#                                                                 -- 1<<1 PreCompletion done (if 0 it is not yet done)
#                                                                 -- 1<<2 Completion done (if 0 it is not yet done)
#     LastModTime TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,  -- when was this record last written
#     LastModBy BIGINT NOT NULL DEFAULT 0,                        -- employee UID (from phonebook) that modified it
#     CreateTS TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,      -- when was this record created
#     CreateBy BIGINT NOT NULL DEFAULT 0,                         -- employee UID (from phonebook) that created this record
#     PRIMARY KEY(TID)
# );

# CREATE TABLE TaskList (
#     TLID BIGINT NOT NULL AUTO_INCREMENT,
#     BID BIGINT NOT NULL DEFAULT 0,
#     Name VARCHAR(256) NOT NULL DEFAULT '',                      -- TaskList name
#     Cycle BIGINT NOT NULL DEFAULT 0,                            -- recurrence frequency (not editable)
#     DtDue TIMESTAMP NOT NULL DEFAULT '1970-01-01 00:00:00',     -- All tasks in task list are due on this date
#     DtPreDue TIMESTAMP NOT NULL DEFAULT '1970-01-01 00:00:00',  -- All tasks in task list pre-completion date
#     DtDone TIMESTAMP NOT NULL DEFAULT '1970-01-01 00:00:00',    -- Task completion Date
#     DtPreDone TIMESTAMP NOT NULL DEFAULT '1970-01-01 00:00:00', -- Task Pre Completion Date
#     FLAGS BIGINT NOT NULL DEFAULT 0,                            -- 1<<0
#     LastModTime TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,  -- when was this record last written
#     LastModBy BIGINT NOT NULL DEFAULT 0,                        -- employee UID (from phonebook) that modified it
#     CreateTS TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,      -- when was this record created
#     CreateBy BIGINT NOT NULL DEFAULT 0,                         -- employee UID (from phonebook) that created this record
#     PRIMARY KEY(TLID)
# );

# CREATE TABLE TaskListDefinition (
#     TLDID BIGINT NOT NULL AUTO_INCREMENT,
#     BID BIGINT NOT NULL DEFAULT 0,
#     Name VARCHAR(256) NOT NULL DEFAULT '',                      -- TaskList name
#     Cycle BIGINT NOT NULL DEFAULT 0,                            -- recurrence frequency (editable)
#     DtDue TIMESTAMP NOT NULL DEFAULT '1970-01-01 00:00:00',     -- All tasks in task list are due on this date
#     DtPreDue TIMESTAMP NOT NULL DEFAULT '1970-01-01 00:00:00',  -- All tasks in task list pre-completion date
#     DtDone TIMESTAMP NOT NULL DEFAULT '1970-01-01 00:00:00',    -- Task completion Date
#     DtPreDone TIMESTAMP NOT NULL DEFAULT '1970-01-01 00:00:00', -- Task Pre Completion Date
#     FLAGS BIGINT NOT NULL DEFAULT 0,                            -- 1<<0
#     LastModTime TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,  -- when was this record last written
#     LastModBy BIGINT NOT NULL DEFAULT 0,                        -- employee UID (from phonebook) that modified it
#     CreateTS TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,      -- when was this record created
#     CreateBy BIGINT NOT NULL DEFAULT 0,                         -- employee UID (from phonebook) that created this record
#     PRIMARY KEY(TLDID)
# );

# CREATE TABLE TaskDescriptor (
#     TDID BIGINT NOT NULL AUTO_INCREMENT,
#     BID BIGINT NOT NULL DEFAULT 0,
#     TLDID BIGINT NOT NULL DEFAULT 0,                            -- the TaskListDefinition to which this taskDescr belongs
#     Name VARCHAR(256) NOT NULL DEFAULT '',                      -- Task text
#     Worker VARCHAR(80) NOT NULL DEFAULT '',                     -- Name of the associated work function
#     EpochDue TIMESTAMP NOT NULL DEFAULT '1970-01-01 00:00:00',  -- Task Due Date
#     EpochPreDue TIMESTAMP NOT NULL DEFAULT '1970-01-01 00:00:00', -- Pre Completion due date
#     FLAGS BIGINT NOT NULL DEFAULT 0,                            -- 1<<0 pre-completion required (if 0 then there is no pre-completion required)
#     LastModTime TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,  -- when was this record last written
#     LastModBy BIGINT NOT NULL DEFAULT 0,                        -- employee UID (from phonebook) that modified it
#     CreateTS TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,      -- when was this record created
#     CreateBy BIGINT NOT NULL DEFAULT 0,                         -- employee UID (from phonebook) that created this record
#     PRIMARY KEY(TDID)
# );

# # March 12, 2018 -- AWS production mysql server required DATETIME rather than TIMESTAMP for Default val
# ALTER TABLE Task MODIFY DtDue DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00';
# ALTER TABLE Task MODIFY DtPreDue DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00';
# ALTER TABLE Task MODIFY DtDone DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00';
# ALTER TABLE Task MODIFY DtPreDone DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00';

# ALTER TABLE TaskList MODIFY DtDue DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00';
# ALTER TABLE TaskList MODIFY DtPreDue DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00';
# ALTER TABLE TaskList MODIFY DtDone DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00';
# ALTER TABLE TaskList MODIFY DtPreDone DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00';

# ALTER TABLE TaskListDefinition MODIFY DtDue DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00';
# ALTER TABLE TaskListDefinition MODIFY DtPreDue DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00';
# ALTER TABLE TaskListDefinition MODIFY DtDone DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00';
# ALTER TABLE TaskListDefinition MODIFY DtPreDone DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00';

# ALTER TABLE TaskDescriptor MODIFY EpochDue DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00';
# ALTER TABLE TaskDescriptor MODIFY EpochPreDue DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00';

# # March 14, 2018
# DROP TABLE IF EXISTS TaskListDefinition;
# CREATE TABLE TaskListDefinition (
#     TLDID BIGINT NOT NULL AUTO_INCREMENT,
#     BID BIGINT NOT NULL DEFAULT 0,
#     Name VARCHAR(256) NOT NULL DEFAULT '',                      -- TaskList name
#     Cycle BIGINT NOT NULL DEFAULT 0,                            -- recurrence frequency (editable)
#     Epoch DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00',      -- TaskList start Date
#     EpochDue DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00',   -- TaskList Due Date
#     EpochPreDue DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00', -- Pre Completion due date
#     FLAGS BIGINT NOT NULL DEFAULT 0,                            -- 1<<0
#     LastModTime TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,  -- when was this record last written
#     LastModBy BIGINT NOT NULL DEFAULT 0,                        -- employee UID (from phonebook) that modified it
#     CreateTS TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,      -- when was this record created
#     CreateBy BIGINT NOT NULL DEFAULT 0,                         -- employee UID (from phonebook) that created this record
#     PRIMARY KEY(TLDID)
# );

# March 16, 2018
# DROP TABLE IF EXISTS Task;
# CREATE TABLE Task (
#     TID BIGINT NOT NULL AUTO_INCREMENT,
#     BID BIGINT NOT NULL DEFAULT 0,
#     TLID BIGINT NOT NULL DEFAULT 0,                             -- the TaskList to which this task belongs
#     Name VARCHAR(256) NOT NULL DEFAULT '',                      -- Task text
#     Worker VARCHAR(80) NOT NULL DEFAULT '',                     -- Name of the associated work function
#     DtDue DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00',      -- Task Due Date
#     DtPreDue DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00',   -- Pre Completion due date
#     DtDone DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00',     -- Task completion Date
#     DtPreDone DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00',  -- Task Pre Completion Date
#     FLAGS BIGINT NOT NULL DEFAULT 0,                            -- 1<<0 pre-completion required (if 0 then there is no pre-completion required)
#                                                                 -- 1<<1 PreCompletion done (if 0 it is not yet done)
#                                                                 -- 1<<2 Completion done (if 0 it is not yet done)
#     DoneUID BIGINT NOT NULL DEFAULT 0,                          -- user who marked this task done
#     PreDoneUID BIGINT NOT NULL DEFAULT 0,                       -- user who marked this task predone
#     Comment VARCHAR(2048) NOT NULL DEFAULT '',                  -- any user comments
#     LastModTime TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,  -- when was this record last written
#     LastModBy BIGINT NOT NULL DEFAULT 0,                        -- employee UID (from phonebook) that modified it
#     CreateTS TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,      -- when was this record created
#     CreateBy BIGINT NOT NULL DEFAULT 0,                         -- employee UID (from phonebook) that created this record
#     PRIMARY KEY(TID)
# );

# DROP TABLE IF EXISTS TaskList;
# CREATE TABLE TaskList (
#     TLID BIGINT NOT NULL AUTO_INCREMENT,
#     BID BIGINT NOT NULL DEFAULT 0,
#     Name VARCHAR(256) NOT NULL DEFAULT '',                      -- TaskList name
#     Cycle BIGINT NOT NULL DEFAULT 0,                            -- recurrence frequency (not editable)
#     DtDue DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00',      -- All tasks in task list are due on this date
#     DtPreDue DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00',   -- All tasks in task list pre-completion date
#     DtDone DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00',     -- Task completion Date
#     DtPreDone DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00',  -- Task Pre Completion Date
#     FLAGS BIGINT NOT NULL DEFAULT 0,                            -- 1<<0 - 0 = active, 1 = inactive
#     DoneUID BIGINT NOT NULL DEFAULT 0,                          -- user who marked this task done
#     PreDoneUID BIGINT NOT NULL DEFAULT 0,                       -- user who marked this task predone
#     Comment VARCHAR(2048) NOT NULL DEFAULT '',                  -- any user comments
#     LastModTime TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,  -- when was this record last written
#     LastModBy BIGINT NOT NULL DEFAULT 0,                        -- employee UID (from phonebook) that modified it
#     CreateTS TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,      -- when was this record created
#     CreateBy BIGINT NOT NULL DEFAULT 0,                         -- employee UID (from phonebook) that created this record
#     PRIMARY KEY(TLID)
# );

# 23 Mar, 2018
# DROP TABLE IF EXISTS FlowPart;
# CREATE TABLE FlowPart (
#     FlowPartID BIGINT NOT NULL AUTO_INCREMENT,
#     BID BIGINT NOT NULL DEFAULT 0,                                                         -- Business id
#     Flow VARCHAR(50) NOT NULL DEFAULT '',                                                  -- for which flow we're storing data ("RA=Rental Agreement Flow")
#     FlowID VARCHAR(50) NOT NULL DEFAULT '',                                                -- unique random flow ID for which we will store relavant json data
#     PartType SMALLINT NOT NULL DEFAULT 0,                                                  -- for which part type ("ASM", "PET", "VEHICLE")
#     Data JSON DEFAULT NULL,                                                                -- JSON Data for each flow type
#     LastModTime TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,  -- when was it last updated
#     LastModBy BIGINT NOT NULL DEFAULT 0,                                                   -- who modified it last
#     CreateTS TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,                                 -- when was it created
#     CreateBy BIGINT NOT NULL DEFAULT 0,                                                    -- who created it
#     PRIMARY KEY(FlowPartID),
#     UNIQUE KEY FlowPartUnique (FlowPartID, BID, FlowID)
# );

# April 4, 2018
# ALTER TABLE TaskListDefinition ADD Comment VARCHAR(2048) NOT NULL DEFAULT '' AFTER FLAGS;
# ALTER TABLE TaskDescriptor ADD Comment VARCHAR(2048) NOT NULL DEFAULT '' AFTER FLAGS;

# 16th March, 2018
# ALTER TABLE Rentable ADD Comment VARCHAR(2048) NOT NULL DEFAULT ''; -- Add Comment textfield to Rentable table

# May 5, 2018
# ALTER TABLE TaskList ADD EmailList VARCHAR(2048) NOT NULL DEFAULT '' AFTER PreDoneUID;

# May 5, 2018
#     Somehow, phonebook schema is getting grafted onto the rentroll database
# DROP TABLE IF EXISTS classes;
# DROP TABLE IF EXISTS companies;
# DROP TABLE IF EXISTS compensation;
# DROP TABLE IF EXISTS counters;
# DROP TABLE IF EXISTS deductionlist;
# DROP TABLE IF EXISTS deductions;
# DROP TABLE IF EXISTS departments;
# DROP TABLE IF EXISTS fieldperms;
# DROP TABLE IF EXISTS jobtitles;
# DROP TABLE IF EXISTS people;
# DROP TABLE IF EXISTS roles;
# DROP TABLE IF EXISTS sessions;

# May 8, 2018
# ALTER TABLE TaskList ADD DtLastNotify DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00' AFTER EmailList;
# ALTER TABLE TaskList ADD DurWait BIGINT NOT NULL DEFAULT 0 AFTER DtLastNotify;
# ALTER TABLE TaskListDefinition ADD EmailList VARCHAR(2048) NOT NULL DEFAULT '' AFTER FLAGS;

# May 9, 2018
# ALTER TABLE TaskList CHANGE DurWait DurWait BIGINT NOT NULL DEFAULT 86400000000000;

# May 11, 2018
# ALTER TABLE TaskList ADD TLDID BIGINT NOT NULL DEFAULT 0 AFTER BID;

# May 14, 2018
# ALTER TABLE TaskList ADD PTLID BIGINT NOT NULL DEFAULT 0 AFTER BID;

# May 16, 2018
# ALTER TABLE RentableTypes ADD ARID BIGINT NOT NULL DEFAULT 0 AFTER FLAGS;

# May 25, 2018
# ALTER TABLE Business ADD ClosePeriodTLID BIGINT NOT NULL DEFAULT 0 AFTER DefaultGSRPC;

# May 25, 2018
# DROP TABLE IF EXISTS FlowPart;
# DROP TABLE IF EXISTS Flow;
# CREATE TABLE Flow (
#     FlowID BIGINT NOT NULL AUTO_INCREMENT,
#     BID BIGINT NOT NULL DEFAULT 0,                                                         -- Business id
#     FlowType VARCHAR(50) NOT NULL DEFAULT '',                                              -- for which flow we're storing data ("RA=Rental Agreement Flow")
#     Data JSON DEFAULT NULL,                                                                -- JSON Data for each flow type
#     LastModTime TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,  -- when was it last updated
#     LastModBy BIGINT NOT NULL DEFAULT 0,                                                   -- who modified it last
#     CreateTS TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,                                 -- when was it created
#     CreateBy BIGINT NOT NULL DEFAULT 0,                                                    -- who created it
#     PRIMARY KEY(FlowID)
# );

# May 28, 2018
# DROP TABLE IF EXISTS FlowPart;

# May 29, 2018
# DROP TABLE IF EXISTS ClosePeriod;
# CREATE TABLE ClosePeriod (
#     CPID BIGINT NOT NULL AUTO_INCREMENT,                        -- Close Period ID
#     BID BIGINT NOT NULL DEFAULT 0,                              -- Business id
#     TLID BIGINT NOT NULL DEFAULT 0,                             -- Task List that was used for close
#     Dt DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00',         -- Date/Time of close
#     LastModTime TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,  -- when was this record last written
#     LastModBy BIGINT NOT NULL DEFAULT 0,                        -- employee UID (from phonebook) that modified it
#     CreateTS TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,      -- when was this record created
#     CreateBy BIGINT NOT NULL DEFAULT 0,                         -- employee UID (from phonebook) that created this record
#     PRIMARY KEY (CPID)
# );

# Jun 1, 2018
# ALTER TABLE RentalAgreementRentables ADD PRID BIGINT NOT NULL DEFAULT 0 AFTER RID;
# ALTER TABLE RentableTypes DROP COLUMN ManageToBudget;

# June 6, 2018
# ALTER TABLE RentalAgreementPets ADD TCID BIGINT NOT NULL DEFAULT 0 AFTER RAID;

# June 7, 2018
# ALTER TABLE Flow ADD UserRefNo VARCHAR(50) NOT NULL DEFAULT '' AFTER BID;

# Jun 13, 2018
# ALTER TABLE Transactant MODIFY IsCompany TINYINT(1) NOT NULL DEFAULT 0;

# Jun 14, 2018
# ALTER TABLE User MODIFY EligibleFutureUser TINYINT(1) NOT NULL DEFAULT 1;

# Jun 14, 2018
# ALTER TABLE Payor MODIFY EligibleFuturePayor TINYINT(1) NOT NULL DEFAULT 1;

# Jun 14, 2018
# ALTER TABLE GLAccount MODIFY AllowPost TINYINT(1) NOT NULL DEFAULT 0;

# June 14, 2018
# ALTER TABLE Transactant ADD FLAGS BIGINT NOT NULL DEFAULT 0 AFTER Website;
# ALTER TABLE Prospect ADD EvictedDes  VARCHAR(2048) NOT NULL DEFAULT '' AFTER FLAGS;
# ALTER TABLE Prospect ADD ConvictedDes  VARCHAR(2048) NOT NULL DEFAULT '' AFTER EvictedDes;
# ALTER TABLE Prospect ADD BankruptcyDes  VARCHAR(2048) NOT NULL DEFAULT '' AFTER ConvictedDes;
# ALTER TABLE Payor ADD FLAGS BIGINT NOT NULL DEFAULT 0 AFTER EligibleFuturePayor;
# ALTER TABLE Payor ADD SSN CHAR(128) NOT NULL DEFAULT '' AFTER FLAGS;
# ALTER TABLE Payor ADD DriversLicense CHAR(128) NOT NULL DEFAULT '' AFTER SSN;
# ALTER TABLE Payor ADD GrossIncome DECIMAL(19,4) NOT NULL DEFAULT 0.0 AFTER DriversLicense;
# ALTER TABLE User ADD FLAGS BIGINT NOT NULL DEFAULT 0 AFTER EligibleFutureUser;

# Jun 15, 2018
# ALTER TABLE OtherDeliverables MODIFY Active TINYINT(1) NOT NULL DEFAULT 0;
# ALTER TABLE Flow ADD ID BIGINT NOT NULL DEFAULT 0 AFTER FlowType;
# ALTER TABLE Vehicle ADD VIN VARCHAR(20) NOT NULL DEFAULT '' AFTER VehicleYear;

# June 15, 2018
# ALTER TABLE Payor CHANGE AccountRep ThirdPartySource BIGINT(20) NOT NULL DEFAULT 0;

# June 18, 2018
# ALTER TABLE Prospect CHANGE EmployerStreetAddress CompanyAddress VARCHAR(100) NOT NULL DEFAULT '';
# ALTER TABLE Prospect CHANGE EmployerCity CompanyCity VARCHAR(100) NOT NULL DEFAULT '';
# ALTER TABLE Prospect CHANGE EmployerState CompanyState VARCHAR(100) NOT NULL DEFAULT '';
# ALTER TABLE Prospect CHANGE EmployerPostalCode CompanyPostalCode VARCHAR(100) NOT NULL DEFAULT '';
# ALTER TABLE Prospect CHANGE EmployerEmail CompanyEmail VARCHAR(100) NOT NULL DEFAULT '';
# ALTER TABLE Prospect CHANGE EmployerPhone CompanyPhone VARCHAR(100) NOT NULL DEFAULT '';
# ALTER TABLE Prospect DROP COLUMN EmployerName;

# June 18, 2018
# ALTER TABLE Prospect ADD CurrentAddress VARCHAR(200) NOT NULL DEFAULT '' AFTER OutcomeSLSID;
# ALTER TABLE Prospect ADD CurrentLandLordName VARCHAR(100) NOT NULL DEFAULT '' AFTER CurrentAddress;
# ALTER TABLE Prospect ADD CurrentLandLordPhoneNo VARCHAR(20) NOT NULL DEFAULT '' AFTER CurrentLandLordName;
# ALTER TABLE Prospect ADD CurrentReasonForMoving BIGINT NOT NULL DEFAULT 0 AFTER CurrentLandLordPhoneNo;
# ALTER TABLE Prospect ADD CurrentLengthOfResidency VARCHAR(100) NOT NULL DEFAULT '' AFTER CurrentReasonForMoving;
# ALTER TABLE Prospect ADD PriorAddress VARCHAR(200) NOT NULL DEFAULT '' AFTER CurrentLengthOfResidency;
# ALTER TABLE Prospect ADD PriorLandLordName VARCHAR(100) NOT NULL DEFAULT '' AFTER PriorAddress;
# ALTER TABLE Prospect ADD PriorLandLordPhoneNo VARCHAR(20) NOT NULL DEFAULT '' AFTER PriorLandLordName;
# ALTER TABLE Prospect ADD PriorReasonForMoving BIGINT NOT NULL DEFAULT 0 AFTER PriorLandLordPhoneNo;
# ALTER TABLE Prospect ADD PriorLengthOfResidency VARCHAR(100) NOT NULL DEFAULT '' AFTER PriorReasonForMoving;
# ALTER TABLE Transactant ADD Comment VARCHAR(2048) NOT NULL DEFAULT '' AFTER FLAGS;
# ALTER TABLE Prospect DROP COLUMN FloatingDeposit, DROP COLUMN RAID;
# CREATE TABLE BusinessProperties (
#     BPID BIGINT NOT NULL AUTO_INCREMENT,
#     BID BIGINT NOT NULL DEFAULT 0,                              -- Business
#     Name VARCHAR(100) NOT NULL DEFAULT '',                      -- Property Name
#     FLAGS BIGINT NOT NULL DEFAULT 0,                            -- last bit =0(EDI disabled), =1(EDI enabled)
#     Data JSON DEFAULT NULL,                                     -- JSON Data for this property
#     LastModTime TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,  -- when was this record last written
#     LastModBy BIGINT NOT NULL DEFAULT 0,                        -- employee UID (from phonebook) that modified it
#     CreateTS TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,      -- when was this record created
#     CreateBy BIGINT NOT NULL DEFAULT 0,                         -- employee UID (from phonebook) that created this record
#     PRIMARY KEY (BPID)
# );

# June 19, 2018
# ALTER TABLE Prospect DROP COLUMN ApplicationFee;
# ALTER TABLE User CHANGE EmergencyEmail EmergencyContactEmail VARCHAR(100) NOT NULL DEFAULT '';

# June 20, 2018
# ALTER TABLE Prospect ADD CommissionableThirdParty TEXT NOT NULL AFTER PriorLengthOfResidency;

# June 20, 2018
# ALTER TABLE GLAccount DROP COLUMN Status;

# June 21, 2018
# ALTER TABLE Prospect CHANGE OutcomeSLSID Outcome BIGINT NOT NULL DEFAULT 0;
# ALTER TABLE Prospect CHANGE Approver Approver1 BIGINT NOT NULL DEFAULT 0;
# ALTER TABLE Prospect ADD DecisionDate1 DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00' AFTER Approver1;
# ALTER TABLE Prospect CHANGE DeclineReasonSLSID DeclineReason1 BIGINT NOT NULL DEFAULT 0;
# ALTER TABLE Prospect ADD Approver2 BIGINT NOT NULL DEFAULT 0 AFTER DeclineReason1;
# ALTER TABLE Prospect ADD DecisionDate2 DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00' AFTER Approver2;
# ALTER TABLE Prospect ADD DeclineReason2 BIGINT NOT NULL DEFAULT 0 AFTER DecisionDate2;
# ALTER TABLE Prospect ADD SpecialNeeds VARCHAR(1024) NOT NULL DEFAULT '' AFTER OtherPreferences;

# June 22, 2018
# ALTER TABLE Prospect DROP COLUMN Approver1;
# ALTER TABLE Prospect DROP COLUMN DecisionDate1;
# ALTER TABLE Prospect DROP COLUMN DeclineReason1;
# ALTER TABLE Prospect DROP COLUMN Approver2;
# ALTER TABLE Prospect DROP COLUMN DecisionDate2;
# ALTER TABLE Prospect DROP COLUMN DeclineReason2;
# ALTER TABLE Prospect DROP COLUMN Outcome;
# ALTER TABLE Prospect DROP COLUMN DesiredUsageStartDate;
# ALTER TABLE Prospect DROP COLUMN RentableTypePreference;
# ALTER TABLE Prospect DROP COLUMN CSAgent;
# ALTER TABLE RentalAgreement ADD Approver1 BIGINT NOT NULL DEFAULT 0 AFTER FLAGS;
# ALTER TABLE RentalAgreement ADD DecisionDate1 DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00' AFTER Approver1;
# ALTER TABLE RentalAgreement ADD DeclineReason1 BIGINT NOT NULL DEFAULT 0 AFTER DecisionDate1;
# ALTER TABLE RentalAgreement ADD Approver2 BIGINT NOT NULL DEFAULT 0 AFTER DeclineReason1;
# ALTER TABLE RentalAgreement ADD DecisionDate2 DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00' AFTER Approver2;
# ALTER TABLE RentalAgreement ADD DeclineReason2 BIGINT NOT NULL DEFAULT 0 AFTER DecisionDate2;
# ALTER TABLE RentalAgreement ADD Outcome BIGINT NOT NULL DEFAULT 0 AFTER DeclineReason2;
# ALTER TABLE RentalAgreement ADD DesiredUsageStartDate DATE NOT NULL DEFAULT '1970-01-01 00:00:00' AFTER RightOfFirstRefusal;
# ALTER TABLE RentalAgreement ADD RentableTypePreference BIGINT NOT NULL DEFAULT 0 AFTER DesiredUsageStartDate;

# June 26, 2018
# ALTER TABLE RentalAgreement ADD NoticeToMoveUID BIGINT NOT NULL DEFAULT 0 AFTER Outcome;
# ALTER TABLE RentalAgreement ADD NoticeToMoveDate DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00' AFTER NoticeToMoveUID;
# ALTER TABLE RentalAgreement ADD TerminatorUID BIGINT NOT NULL DEFAULT 0 AFTER NoticeToMoveDate;
# ALTER TABLE RentalAgreement ADD TerminationDate DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00' AFTER TerminatorUID;
# ALTER TABLE Rentable ADD PRID BIGINT NOT NULL DEFAULT 0 AFTER BID;

# June 27, 2018
# ALTER TABLE RentalAgreement ADD LeaseTerminationReason BIGINT NOT NULL DEFAULT 0 AFTER TerminationDate;
# ALTER TABLE RentalAgreement ADD NoticeToMoveReported DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00' AFTER NoticeToMoveDate;
# ALTER TABLE RentalAgreement ADD PRAID BIGINT NOT NULL DEFAULT 0 AFTER RAID;
# ALTER TABLE RentalAgreement ADD DocumentDate  DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00' AFTER NLID;

# July 2, 2018
# ALTER TABLE Assessments CHANGE ATypeLID AssocElemType BIGINT NOT NULL DEFAULT 0;
# ALTER TABLE Assessments ADD AssocElemID BIGINT NOT NULL DEFAULT 0 AFTER AssocElemType;
# ALTER TABLE RentalAgreement ADD ORIGIN BIGINT NOT NULL DEFAULT 0 AFTER PRAID;

# July 18, 2018
# ALTER TABLE AR ADD DefaultRentCycle SMALLINT NOT NULL DEFAULT 0;
# ALTER TABLE AR ADD DefaultProrationCycle SMALLINT NOT NULL DEFAULT 0;

# July 19, 2018
# ALTER TABLE Payor DROP COLUMN SSN;

# July 20, 2018
# ALTER TABLE Payor MODIFY TaxpayorID CHAR(128) NOT NULL DEFAULT '';

# July 23, 2018
# ALTER TABLE Payor DROP COLUMN ThirdPartySource;
# ALTER TABLE Prospect ADD ThirdPartySource BIGINT NOT NULL DEFAULT 0 AFTER CommissionableThirdParty;
# ALTER TABLE User CHANGE AlternateAddress AlternateEmailAddress VARCHAR(100) NOT NULL DEFAULT '';

# July 24, 2018
# ALTER TABLE User CHANGE Industry Industry BIGINT NOT NULL DEFAULT 0;

# July 27, 2018
# ALTER TABLE Prospect MODIFY ThirdPartySource VARCHAR(100) NOT NULL DEFAULT '';

# July 30, 2018
# ALTER TABLE RentalAgreement ADD ApplicationReadyUID BIGINT NOT NULL DEFAULT 0 AFTER FLAGS;
# ALTER TABLE RentalAgreement ADD ApplicationReadyDate DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00' AFTER ApplicationReadyUID;
# ALTER TABLE RentalAgreement ADD MoveInUID BIGINT NOT NULL DEFAULT 0 AFTER DeclineReason2;
# ALTER TABLE RentalAgreement ADD MoveInDate DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00' AFTER MoveInUID;
# ALTER TABLE RentalAgreement ADD ActiveUID BIGINT NOT NULL DEFAULT 0 AFTER MoveInDate;
# ALTER TABLE RentalAgreement ADD ActiveDate DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00' AFTER ActiveUID;

# Aug 21, 2018
# RENAME TABLE RentalAgreementPets TO Pets;
# CREATE TABLE TBind (
#     TBID BIGINT NOT NULL AUTO_INCREMENT,                    -- unique id
#     SourceElemType BIGINT NOT NULL DEFAULT 0,               -- Source element type, example: 14 = Pet, 15 = Vehicle. Values defined in dbtypes.go
#     SourceElemID BIGINT NOT NULL DEFAULT 0,                 -- ID of the Source Element for the Associated Element.  Ex. if SourceElemType = 14, then SourceElemID is the PETID
#     AssocElemType BIGINT NOT NULL DEFAULT 0,                -- Associated element type, example: 14 = Pet, 15 = Vehicle. Values defined in dbtypes.go
#     AssocElemID BIGINT NOT NULL DEFAULT 0,                  -- ID for the Associated Element.  Ex. if AssocElemType = 14, then AssocElemID is the PETID
#     DtStart DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00',-- epoch date for recurring assessments; the date/time of the assessment for instances
#     DtStop DATETIME NOT NULL DEFAULT '2066-01-01 00:00:00', -- stop date for recurrent assessments; the date/time of the assessment for instances
#     FLAGS BIGINT NOT NULL DEFAULT 0,                        -- Bits 0-1:  0 = unpaid, 1 = partially paid, 2 = fully paid, 3 = not-defined at this time
#     LastModTime TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,  -- when was this record last written
#     LastModBy BIGINT NOT NULL DEFAULT 0,                    -- employee UID (from phonebook) that modified it
#     CreateTS TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,  -- when was this record created
#     CreateBy BIGINT NOT NULL DEFAULT 0,                     -- employee UID (from phonebook) that created this record
#     PRIMARY KEY (TBID)
# );
# ALTER TABLE TBind ADD COLUMN BID BIGINT NOT NULL DEFAULT 0 AFTER TBID;

# Dec 30, 2018
# RENAME TABLE RentableStatus TO RentableUseStatus;
# ALTER TABLE RentableUseStatus ADD Comment VARCHAR(2048) NOT NULL DEFAULT '' AFTER DtStop;
# ALTER TABLE RentableUseStatus DROP Column DtNoticeToVacate;
# CREATE TABLE RentableLeaseStatus (
#     RLID BIGINT NOT NULL AUTO_INCREMENT,                            -- unique id for Rentable Status
#     RID BIGINT NOT NULL DEFAULT 0,                                  -- associated Rentable
#     BID BIGINT NOT NULL DEFAULT 0,                                  -- Business
#     LeaseStatus SMALLINT NOT NULL DEFAULT 0,                        -- 0 = Not Leased, 1 = Leased, 2 = Reserved
#     DtStart DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00',        -- start time for this state
#     DtStop DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00',         -- stop time for this state
#     Comment VARCHAR(2048) NOT NULL DEFAULT '',                      -- company notes for this person
#     LastModTime TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,  -- when was this record last written
#     LastModBy BIGINT NOT NULL DEFAULT 0,                            -- employee UID (from phonebook) that modified it
#     CreateTS TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,          -- when was this record created
#     CreateBy BIGINT NOT NULL DEFAULT 0,                             -- employee UID (from phonebook) that created this record
#     PRIMARY KEY (RLID)
# );
# ALTER TABLE RentableUseStatus DROP LeaseStatus;
# ALTER TABLE RentableLeaseStatus ADD FirstName VARCHAR(50) NOT NULL DEFAULT '' AFTER Comment;
# ALTER TABLE RentableLeaseStatus ADD LastName VARCHAR(50) NOT NULL DEFAULT '' AFTER FirstName;
# ALTER TABLE RentableLeaseStatus ADD Email VARCHAR(100) NOT NULL DEFAULT '' AFTER LastName;
# ALTER TABLE RentableLeaseStatus ADD Phone VARCHAR(100) NOT NULL DEFAULT '' AFTER Email;
# ALTER TABLE RentableLeaseStatus ADD Address VARCHAR(100) NOT NULL DEFAULT '' AFTER Phone;
# ALTER TABLE RentableLeaseStatus ADD Address2 VARCHAR(100) NOT NULL DEFAULT '' AFTER Address;
# ALTER TABLE RentableLeaseStatus ADD City VARCHAR(100) NOT NULL DEFAULT '' AFTER Address2;
# ALTER TABLE RentableLeaseStatus ADD State CHAR(25) NOT NULL DEFAULT '' AFTER City;
# ALTER TABLE RentableLeaseStatus ADD PostalCode VARCHAR(100) NOT NULL DEFAULT '' AFTER State;
# ALTER TABLE RentableLeaseStatus ADD Country VARCHAR(100) NOT NULL DEFAULT '' AFTER PostalCode;
# ALTER TABLE RentableLeaseStatus ADD CCName VARCHAR(100) NOT NULL DEFAULT '' AFTER Country;
# ALTER TABLE RentableLeaseStatus ADD CCType VARCHAR(100) NOT NULL DEFAULT '' AFTER CCName;
# ALTER TABLE RentableLeaseStatus ADD CCNumber VARCHAR(100) NOT NULL DEFAULT '' AFTER CCType;
# ALTER TABLE RentableLeaseStatus ADD CCExpMonth VARCHAR(100) NOT NULL DEFAULT '' AFTER CCNumber;
# ALTER TABLE RentableLeaseStatus ADD CCExpYear VARCHAR(100) NOT NULL DEFAULT '' AFTER CCExpMonth;
#


########################################
# schemamod()
#	Parameters:
# 		$1 = db file name to check
########################################
schemamod () {
    if [ -f ${1} ]; then
    	echo "DROP DATABASE IF EXISTS ${DBNAME}; create database ${DBNAME}" | ${MYSQL}
		echo -n "${1}: loading... "
		${MYSQL} ${DBNAME} < ${1}
		echo -n "updating... "
		${MYSQL} ${DBNAME} < ${MODFILE}
		echo -n "saving... "
		${MYSQLDUMP} ${DBNAME} > ${1}
		echo "done"
    else
		echo "file not found: ${1}"
    fi
}

#==============================================================================
# SCRIPT BEGINS HERE...
#==============================================================================
MODFILE="dbqqqmods.sql"
MYSQL="mysql --no-defaults"
MYSQLDUMP="mysqldump --no-defaults"
DBNAME="rentroll"

while getopts "f:F:" o; do
	echo "o = ${o}"
	case "${o}" in
		f | F)
			F=${OPTARG}
			exit 0
			;;
		*) 	usage
			exit 1
			;;
	esac
done
shift $((OPTIND-1))

#=====================================================
#  Put modifications to schema in the lines below
#=====================================================
cat >${MODFILE} <<EOF
CREATE TABLE RentableUseType (
    UTID BIGINT NOT NULL AUTO_INCREMENT,                            -- unique id for Rentable Use Type
    RID BIGINT NOT NULL DEFAULT 0,                                  -- associated Rentable
    BID BIGINT NOT NULL DEFAULT 0,                                  -- Business
    UseType SMALLINT NOT NULL DEFAULT 0,                            -- 100 = Standard, 101=Administrative, 102=Employee, 103=OwnerOccupied
    DtStart DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00',        -- start time for this state
    DtStop DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00',         -- stop time for this state
    Comment VARCHAR(2048) NOT NULL DEFAULT '',                      -- company notes for this person
    LastModTime TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,  -- when was this record last written
    LastModBy BIGINT NOT NULL DEFAULT 0,                            -- employee UID (from phonebook) that modified it
    CreateTS TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,          -- when was this record created
    CreateBy BIGINT NOT NULL DEFAULT 0,                             -- employee UID (from phonebook) that created this record
    PRIMARY KEY (UTID)
);

EOF

#==============================================================================
# Explanation of the loop
#     IFS=''
#         (or IFS=) prevents leading/trailing whitespace from being trimmed.
#     -r
#         prevents backslash escapes from being interpreted.
#     || [[ -n ${f} ]]
#         prevents the last line from being ignored if it doesn't end with
#         a \n (since  read returns a non-zero exit code when it encounters
#         EOF).
#==============================================================================
while IFS='' read -r f || [[ -n "${f}" ]]; do
    schemamod "${f}"
done < dbfiles.txt
