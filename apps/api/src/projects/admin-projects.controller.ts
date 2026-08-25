import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle, ThrottlerGuard } from '@nestjs/throttler';
import {
  AUTH_IP_THROTTLE_NAME,
  PUBLIC_READ_THROTTLE_NAME,
} from '../auth/auth.constants';
import {
  AdminListQueryDto,
  CreateProjectDto,
  ReorderProjectDto,
  UpdateProjectDto,
} from './dto/project.dto';
import { ProjectsService } from './projects.service';
import { Project } from './projects.schema';

/**
 * Every route here sits under /admin, so the global AuthGuard requires a
 * valid access token before any of them run -- that protection comes from
 * the path, which is what keeps a route added here later from being
 * reachable by accident.
 *
 * The throttler is layered on top of that, not in place of it. Authentication
 * decides *who* may call these; the `admin` bucket caps how fast a caller
 * who already got in can go -- which is the only thing standing between a
 * stolen session and dumping or rewriting the whole listing in a loop. The
 * ceiling is set well above anything one person clicking can reach.
 */
@SkipThrottle({
  [AUTH_IP_THROTTLE_NAME]: true,
  [PUBLIC_READ_THROTTLE_NAME]: true,
})
@UseGuards(ThrottlerGuard)
@Controller('admin/projects')
export class AdminProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  /**
   * RF-PROJ4: every status, archived included.
   *
   * `?includeDeleted=true` also surfaces soft-deleted projects, which is how
   * one is found in order to be restored.
   */
  @Get()
  async findAll(
    @Query() { includeDeleted }: AdminListQueryDto,
  ): Promise<Project[]> {
    return this.projectsService.findAll({ includeDeleted });
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Project> {
    return this.projectsService.findById(id);
  }

  @Post()
  async create(@Body() body: CreateProjectDto): Promise<Project> {
    return this.projectsService.create(body);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateProjectDto,
  ): Promise<Project> {
    return this.projectsService.update(id, body);
  }

  /**
   * RF-PROJ5. Answers with the whole reordered listing, because moving one
   * project shifts the others and the caller needs the resulting sequence,
   * not just the moved row.
   */
  @Patch(':id/order')
  async reorder(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() { order }: ReorderProjectDto,
  ): Promise<Project[]> {
    return this.projectsService.reorder(id, order);
  }

  /** RF-PROJ3: undoes a soft delete, so a mistaken one is recoverable. */
  @Patch(':id/restore')
  async restore(@Param('id', ParseUUIDPipe) id: string): Promise<Project> {
    return this.projectsService.restore(id);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.projectsService.softDelete(id);
  }
}
