import mongoose, { Schema, Document, Model } from "mongoose";

export interface IEmployee extends Document {
  employeeCode: string; // EMP-0001
  
  // 1. Personal Details
  firstName: string;
  lastName: string;
  email: string;
  officeEmail?: string;
  phone: string;
  dateOfBirth?: Date;
  gender?: string;
  bloodGroup?: string;
  maritalStatus?: string;
  profilePhotoUrl?: string;

  // 2. Official Details
  department?: string;
  designation?: string;
  reportingManager?: mongoose.Types.ObjectId;
  dateOfJoining?: Date;
  workLocation?: string;
  createdBy?: mongoose.Types.ObjectId;

  // 3. Status & Type
  status: "Active" | "Inactive" | "Notice Period" | "Resigned" | "Absconding";
  employeeType: "Full-Time" | "Part-Time" | "Contract" | "Intern";

  // 4. KYC
  kyc: {
    aadharNumber?: string;
    panNumber?: string;
    passportNumber?: string;
  };

  // 5. Bank Details
  bankDetails: {
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    branchName?: string;
  };

  // 6. Education
  education: Array<{
    degree: string;
    institution: string;
    yearOfPassing: string;
    percentage: string;
  }>;

  // 7. Experience
  experience: Array<{
    companyName: string;
    designation: string;
    fromDate: Date;
    toDate: Date;
  }>;

  // 8. Emergency Contact
  emergencyContact: {
    name?: string;
    relation?: string;
    phone?: string;
  };

  // 9. Family Details
  familyDetails: Array<{
    name: string;
    relation: string;
    age?: number;
  }>;

  // 10. Assets
  assets: Array<{
    assetName: string;
    assetId: string;
    issuedDate: Date;
    returnedDate?: Date;
  }>;

  // 11. Documents (References to files)
  documents: Array<{
    documentName: string;
    fileUrl: string;
  }>;

  createdAt: Date;
  updatedAt: Date;
}

const EmployeeSchema: Schema<IEmployee> = new Schema(
  {
    employeeCode: { type: String, required: true, unique: true },
    
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    officeEmail: { type: String },
    phone: { type: String, required: true },
    dateOfBirth: { type: Date },
    gender: { type: String },
    bloodGroup: { type: String },
    maritalStatus: { type: String },
    profilePhotoUrl: { type: String },

    department: { type: String },
    designation: { type: String },
    reportingManager: { type: Schema.Types.ObjectId, ref: "Employee" },
    dateOfJoining: { type: Date },
    workLocation: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },

    status: { 
      type: String, 
      enum: ["Active", "Inactive", "Notice Period", "Resigned", "Absconding"], 
      default: "Active" 
    },
    employeeType: { 
      type: String, 
      enum: ["Full-Time", "Part-Time", "Contract", "Intern"], 
      default: "Full-Time" 
    },

    kyc: {
      aadharNumber: { type: String },
      panNumber: { type: String },
      passportNumber: { type: String },
    },

    bankDetails: {
      bankName: { type: String },
      accountNumber: { type: String },
      ifscCode: { type: String },
      branchName: { type: String },
    },

    education: [{
      degree: String,
      institution: String,
      yearOfPassing: String,
      percentage: String,
    }],

    experience: [{
      companyName: String,
      designation: String,
      fromDate: Date,
      toDate: Date,
    }],

    emergencyContact: {
      name: String,
      relation: String,
      phone: String,
    },

    familyDetails: [{
      name: String,
      relation: String,
      age: Number,
    }],

    assets: [{
      assetName: String,
      assetId: String,
      issuedDate: Date,
      returnedDate: Date,
    }],

    documents: [{
      documentName: String,
      fileUrl: String,
    }],
  },
  { timestamps: true }
);

export const Employee: Model<IEmployee> = mongoose.models.Employee || mongoose.model("Employee", EmployeeSchema);
