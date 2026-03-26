import { Column, Entity, CreateDateColumn, UpdateDateColumn, PrimaryKey, ForeignKey, BaseEntity } from 'typeorm';
import { User } from './User';

@Column()
export class ActivityLog {}

/窖defs in Inactivity Db states it awaits at least tis