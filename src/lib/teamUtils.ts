import { Team } from "@/lib/models/Team";
import { User } from "@/lib/models/User";
import { Employee } from "@/lib/models/Employee";
import mongoose from "mongoose";

/**
 * Returns an array of User ObjectIds that the given user has access to 
 * through team memberships (as an owner or member).
 */
export async function getAllowedUserIds(userId: string): Promise<string[]> {
  const teams = await Team.find({ $or: [{ owner: userId }, { members: userId }] });
  if (teams.length === 0) {
    return [userId];
  }

  const allowedIds = new Set<string>();
  allowedIds.add(userId);

  teams.forEach(team => {
    allowedIds.add(team.owner.toString());
    team.members.forEach((m: any) => allowedIds.add(m.toString()));
  });

  return Array.from(allowedIds);
}

/**
 * Returns an array of Employee ObjectIds that the given user has access to.
 * (Maps User ObjectIds to Employee records by email)
 */
export async function getAllowedEmployeeIds(userId: string): Promise<string[]> {
  const allowedUserIds = await getAllowedUserIds(userId);
  const users = await User.find({ _id: { $in: allowedUserIds } }).lean();
  const emails = users.map(u => u.email);

  const employees = await Employee.find({ email: { $in: emails } }).lean();
  return employees.map(e => (e._id as any).toString());
}

/**
 * Returns an array of Employee ObjectIds that the given user has access to as an OWNER.
 * (Maps User ObjectIds to Employee records by email)
 */
export async function getOwnedEmployeeIds(userId: string): Promise<string[]> {
  const teams = await Team.find({ owner: userId });
  
  const allowedIds = new Set<string>();
  allowedIds.add(userId);

  teams.forEach(team => {
    team.members.forEach((m: any) => allowedIds.add(m.toString()));
  });

  const users = await User.find({ _id: { $in: Array.from(allowedIds) } }).lean();
  const emails = users.map(u => u.email);

  const employees = await Employee.find({ email: { $in: emails } }).lean();
  return employees.map(e => (e._id as any).toString());
}
