<script lang="ts">
	// Layout adapted from GradeCompass's privacy page (MIT, see LICENSE-gradecompass.txt).
	import { brand } from '#lib/brand.ts';
	import Logo from '#lib/components/Logo.svelte';
	import { Button } from '#lib/components/ui/button/index.ts';
	import * as Card from '#lib/components/ui/card/index.ts';
</script>

<svelte:head>
	<title>Privacy - {brand}</title>
</svelte:head>

<div class="flex min-h-screen flex-col items-center">
	<main class="flex grow items-center">
		<Card.Root class="m-4 max-w-2xl">
			<Card.Header class="flex flex-row items-center gap-3">
				<Logo class="size-8 shrink-0" />
				<Card.Title class="text-xl">How {brand} handles your data</Card.Title>
			</Card.Header>

			<Card.Content class="text-tertiary-foreground space-y-6">
				<p>
					{brand} is self-hosted: each copy runs on a server operated by whoever set it up, often the
					student or their family. There is no central {brand} service. This page describes what the app
					itself does; the person running your copy can see anything that passes through their server.
				</p>

				<section class="space-y-2">
					<h2 class="text-secondary-foreground font-semibold">Logging in</h2>
					<p>
						Your district, username and password are sent to this app's server, which uses them to log in
						to your district's StudentVUE portal. Your district's portal doesn't let a web page read
						grades directly from your browser, so the server has to make these requests for you.
					</p>
					<p>
						The server never saves your password. It keeps only the portal's login session, in memory.
					</p>
				</section>

				<section class="space-y-2">
					<h2 class="text-secondary-foreground font-semibold">On the server</h2>
					<ul class="list-disc space-y-1 pl-5">
						<li>
							Your grades are fetched from the portal when you open the app and about once a minute
							while it's open, and kept in the server's memory only while your session is active.
						</li>
						<li>
							Sessions end when you log out, after 30 minutes without use, or when the server restarts.
							Everything held for that session is then discarded.
						</li>
						<li>There is no database. Nothing about you is written to the server's disk.</li>
						<li>
							Server logs record only which step ran, its status and how long it took. They don't include
							usernames, passwords, names or grades.
						</li>
					</ul>
				</section>

				<section class="space-y-2">
					<h2 class="text-secondary-foreground font-semibold">In your browser</h2>
					<ul class="list-disc space-y-1 pl-5">
						<li>
							Your district, username and password are saved in this browser's local storage, so the app
							can reconnect on its own when its server session expires. The password is stored as plain
							text, so anyone with access to this browser profile could read it.
						</li>
						<li>
							Your most recent grades are saved too, including your name and your teachers' names and
							email addresses, so they appear instantly when you reopen the app.
						</li>
						<li>
							<strong>Log Out removes all of this.</strong> Use it on any computer you share.
						</li>
						<li>
							The server sets one cookie, an anonymous session ID that can't be read by scripts. Your
							light or dark mode choice is also remembered.
						</li>
					</ul>
				</section>

				<section class="space-y-2">
					<h2 class="text-secondary-foreground font-semibold">No tracking</h2>
					<p>
						{brand} has no analytics, ads or tracking, and the page loads nothing from other websites (its
						font is bundled with the app). The only outside service it contacts is your district's portal.
					</p>
				</section>

				<section class="space-y-2">
					<h2 class="text-secondary-foreground font-semibold">Demo mode</h2>
					<p>The demo shows made-up grades. It doesn't use a login or contact any district portal.</p>
				</section>

				<p class="text-xs">
					{brand} is an independent, unofficial tool. It is not affiliated with or endorsed by Edupoint
					Educational Systems LLC or your school district. Use of your district's portal is subject to its
					terms of service. Questions about your copy of {brand}? Ask whoever runs it.
				</p>

				<Button href="/" variant="outline">Back to {brand}</Button>
			</Card.Content>
		</Card.Root>
	</main>
</div>
