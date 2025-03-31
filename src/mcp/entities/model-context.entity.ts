import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity()
export class ModelContextEntity {
  @PrimaryColumn()
  id: string;

  @Column()
  modelId: string;

  @Column("simple-json")
  state: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column()
  version: number;
}
