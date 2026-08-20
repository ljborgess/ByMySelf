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
} from '@nestjs/common';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';
import { ProjectsService } from './projects.service';
import { Project } from './projects.schema';

/**
 * Every route here sits under /admin, so the global AuthGuard requires a
 * valid access token before any of them run -- there is deliberately no
 * @UseGuards() on this controller. Protection comes from the path, which is
 * what keeps a route added here later from being reachable by accident.
 */
@Controller('admin/projects')
export class AdminProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  /** RF-PROJ4: every status, archived included. */
  @Get()
  async findAll(): Promise<Project[]> {
    return this.projectsService.findAll();
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

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.projectsService.softDelete(id);
  }
}
