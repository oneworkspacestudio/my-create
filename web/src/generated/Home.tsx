// Generated from screens/Home.aui; edit the AUI source.
import { Badge, Button, Card, Grid, Heading, Icon, Link, Page, Row, Spacer, Stack, Text } from "@/components/ui"

export function Home({ data, onAction }: { data: any; onAction: (name: string) => void }) {
  return (
    <Page>
      <Stack variant="content">
        <Row variant="page-header">
          <Stack gap="sm">
            <Text variant="eyebrow">YOUR CREATIVE WORKSPACE</Text>
            <Heading level={1}>Good ideas deserve a canvas.</Heading>
            <Text variant="muted">Make something new. Or give an existing design a new beginning.</Text>
          </Stack>
          <Button onClick={() => onAction("newDesign")}>
            <Icon name="Plus" />
            <Text>New design</Text>
          </Button>
        </Row>
        <Grid columns={2} variant="welcome">
          <Card variant="import-hero">
            <Badge tone="info">SMART IMPORT</Badge>
            <Heading level={2}>Bring your designs with you.</Heading>
            <Text>Import editable text, shapes and layers from the files you already have. See what was recovered before you start creating.</Text>
            <Button onClick={() => onAction("import")}>Import a design</Button>
            <Text variant="caption">SVG · PowerPoint · PDF · Images · Photoshop</Text>
          </Card>
          <Card variant="creative-art">
            <Text variant="eyebrow">A FRESH PERSPECTIVE</Text>
            <Heading level={1}>
              Make it
              yours.
            </Heading>
            <Text>Your words. Your colours. Your next idea.</Text>
            <Badge tone="success">Created locally, kept privately</Badge>
          </Card>
        </Grid>
        <Row variant="section-header">
          <Heading level={2}>Start with a little inspiration</Heading>
          <Spacer />
          <Link href="https://github.com/oneworkspacestudio/my-create-templates" external={true}>Template collection ↗</Link>
        </Row>
        <Grid columns={3} variant="templates">
          {data.starters.map((item, i) => (
            <Card key={i} variant="template">
              <Text variant="eyebrow">{item.category}</Text>
              <Heading level={2}>{item.title}</Heading>
              <Text variant="muted">{item.description}</Text>
              <Button onClick={() => onAction("starter")} item={item.id} variant="secondary">Use this template</Button>
            </Card>
          ))}
        </Grid>
        <Row variant="section-header">
          <Heading level={2}>Your designs</Heading>
          <Spacer />
          <Button onClick={() => onAction("refresh")} variant="secondary">Refresh</Button>
        </Row>
        {data.empty ? (
          <Card variant="empty">
            <Icon name="Layers" />
            <Heading level={3}>A place for every idea</Heading>
            <Text>Your saved designs and reusable templates will appear here.</Text>
          </Card>
        ) : (
          <Grid columns={3}>
            {data.projects.map((item, i) => (
              <Card key={i} variant="project">
                <Row>
                  <Icon name="Layers" />
                  <Badge>{item.kind}</Badge>
                  <Spacer />
                  <Text variant="caption">{item.revisionLabel}</Text>
                </Row>
                <Heading level={2}>{item.name}</Heading>
                <Text variant="caption">{item.date}</Text>
                <Button onClick={() => onAction("openProject")} item={item.id} variant="secondary">Open design</Button>
              </Card>
            ))}
          </Grid>
        )}
        {data.hasSources && (
          <Card>
            <Heading level={3}>Preserved source files</Heading>
            <Text variant="caption">Failed or cancelled conversions keep their originals. Reopen any source to try again.</Text>
            {data.sources.map((item, i) => (
              <Row key={i}>
                <Text>{item.name}</Text>
                <Badge>{item.format}</Badge>
                <Spacer />
                <Button onClick={() => onAction("retrySource")} item={item.id} variant="secondary">Import again</Button>
                <Button onClick={() => onAction("downloadSource")} item={item.id} variant="secondary">Download original</Button>
              </Row>
            ))}
          </Card>
        )}
      </Stack>
    </Page>
  )
}
